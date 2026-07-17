"""多模型 LLM 服务封装

支持的模型提供商：
- 国产：GLM(智谱)、DeepSeek、Qwen(通义千问)、Kimi(月之暗面)、
        豆包(Doubao/火山引擎)、MiniMax、StepFun(阶跃星辰)
- 国外：Claude(Anthropic)、OpenAI、Gemini(Google)、Groq
- 自定义：支持 OpenAI 兼容接口

统一使用 OpenAI 兼容 SDK 调用，无需为每家单独写适配。

spec-11：支持多 api-key 池轮询 + 熔断器 + 健康检查 + 热替换接力，
对调用方完全透明（generate / generate_json 等公共接口不变）。
"""
import os
import json
import time
import asyncio
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Optional

from dotenv import load_dotenv
from openai import (
    AsyncOpenAI,
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    APIStatusError,
    BadRequestError,
)
from services.circuit_breaker import CircuitBreaker

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class ProviderConfig:
    """模型提供商配置"""
    name: str
    display_name: str
    base_url: str
    default_model: str
    api_key_env: str
    is_openai_compatible: bool = True
    supports_json_mode: bool = True


PROVIDERS: dict[str, ProviderConfig] = {
    # === 国产模型 ===
    "deepseek": ProviderConfig(
        name="deepseek",
        display_name="DeepSeek",
        base_url="https://api.deepseek.com/v1",
        default_model="deepseek-chat",
        api_key_env="DEEPSEEK_API_KEY",
    ),
    "glm": ProviderConfig(
        name="glm",
        display_name="智谱 GLM",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        default_model="glm-4-plus",
        api_key_env="GLM_API_KEY",
    ),
    "qwen": ProviderConfig(
        name="qwen",
        display_name="通义千问",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        default_model="qwen-plus",
        api_key_env="QWEN_API_KEY",
    ),
    "kimi": ProviderConfig(
        name="kimi",
        display_name="Kimi (月之暗面)",
        base_url="https://api.moonshot.cn/v1",
        default_model="moonshot-v1-8k",
        api_key_env="KIMI_API_KEY",
    ),
    "doubao": ProviderConfig(
        name="doubao",
        display_name="豆包",
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        default_model="doubao-pro-32k",
        api_key_env="DOUBAO_API_KEY",
    ),
    "minimax": ProviderConfig(
        name="minimax",
        display_name="MiniMax",
        base_url="https://api.minimax.chat/v1",
        default_model="abab6.5s-chat",
        api_key_env="MINIMAX_API_KEY",
    ),
    "stepfun": ProviderConfig(
        name="stepfun",
        display_name="阶跃星辰",
        base_url="https://api.stepfun.com/v1",
        default_model="step-1-8k",
        api_key_env="STEPFUN_API_KEY",
    ),
    "internlm": ProviderConfig(
        name="internlm",
        display_name="书生 InternLM",
        base_url="https://internlm-chat.intern-ai.org.cn/puyu/api/v1",
        default_model="internlm2.5-latest",
        api_key_env="INTERNLM_API_KEY",
    ),
    # === 国外模型 ===
    "openai": ProviderConfig(
        name="openai",
        display_name="OpenAI",
        base_url="https://api.openai.com/v1",
        default_model="gpt-4o-mini",
        api_key_env="OPENAI_API_KEY",
    ),
    "claude": ProviderConfig(
        name="claude",
        display_name="Anthropic Claude",
        base_url="https://api.anthropic.com/v1",
        default_model="claude-3-5-sonnet-20241022",
        api_key_env="ANTHROPIC_API_KEY",
        supports_json_mode=False,
    ),
    "gemini": ProviderConfig(
        name="gemini",
        display_name="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        default_model="gemini-1.5-flash",
        api_key_env="GEMINI_API_KEY",
    ),
    "groq": ProviderConfig(
        name="groq",
        display_name="Groq",
        base_url="https://api.groq.com/openai/v1",
        default_model="llama-3.3-70b-versatile",
        api_key_env="GROQ_API_KEY",
    ),
    # === 自定义 ===
    "custom": ProviderConfig(
        name="custom",
        display_name="自定义模型",
        base_url="",
        default_model="",
        api_key_env="CUSTOM_API_KEY",
    ),
}


@dataclass
class KeyPool:
    """单个 provider 的 api-key 池：轮询 + 滑动窗口 rpm 限流。

    - keys: 从环境变量逗号分隔解析
    - rpm_limit: 每个 key 每分钟最大调用数（0 表示不限）
    - call_timestamps: 每个 key 一个 deque，记录最近 60s 调用时间戳
    """
    keys: list[str]
    rpm_limit: int = 0
    last_used_idx: int = -1
    call_timestamps: dict[str, deque] = field(default_factory=dict)

    def __post_init__(self):
        self.call_timestamps = {k: deque() for k in self.keys}

    def _purge_old(self, key: str, now: float) -> None:
        dq = self.call_timestamps.get(key)
        if not dq:
            return
        cutoff = now - 60.0
        while dq and dq[0] < cutoff:
            dq.popleft()

    def _is_available(self, key: str) -> bool:
        if self.rpm_limit <= 0:
            return True
        now = time.time()
        self._purge_old(key, now)
        dq = self.call_timestamps.get(key)
        return dq is None or len(dq) < self.rpm_limit

    def next_key(self) -> Optional[str]:
        """轮询返回下一个未达 rpm 上限的 key；全部达限返回 None。"""
        if not self.keys:
            return None
        n = len(self.keys)
        for i in range(n):
            idx = (self.last_used_idx + 1 + i) % n
            key = self.keys[idx]
            if self._is_available(key):
                self.last_used_idx = idx
                return key
        return None

    def available_keys(self) -> list[str]:
        """返回当前未达 rpm 限制的 key 列表。"""
        # 顺手清理过期时间戳，保持窗口准确
        now = time.time()
        for k in self.keys:
            self._purge_old(k, now)
        return [k for k in self.keys if self._is_available(k)]

    def record_call(self, key: str) -> None:
        """记录一次调用时间戳（调用发起时调用，预留速率槽位）。"""
        dq = self.call_timestamps.get(key)
        if dq is None:
            self.call_timestamps[key] = deque()
            dq = self.call_timestamps[key]
        dq.append(time.time())


class LLMService:
    """多模型 LLM 服务类

    支持切换任意已配置的模型提供商，统一接口调用。
    支持降级回退：主模型失败时自动尝试备用模型。
    spec-11：每个 provider 支持多 key 池轮询 + 熔断器 + 健康检查。
    """

    def __init__(self, primary_provider: str = "deepseek"):
        # provider -> {key -> AsyncOpenAI}（按 key 缓存客户端）
        self._clients: dict[str, dict[str, AsyncOpenAI]] = {}
        self.primary_provider = primary_provider
        self.fallback_providers = ["groq", "openai", "claude"]

        # spec-11 新增
        self.key_pools: dict[str, KeyPool] = {}
        self.circuit_breakers: dict[str, CircuitBreaker] = {}
        self.provider_health: dict[str, dict] = {}
        self._health_check_task: Optional[asyncio.Task] = None

        self._failure_threshold = int(os.getenv("LLM_CIRCUIT_FAILURE_THRESHOLD", "3"))
        self._recovery_timeout = float(os.getenv("LLM_CIRCUIT_RECOVERY_TIMEOUT", "60"))
        self._health_check_interval = int(os.getenv("LLM_HEALTH_CHECK_INTERVAL", "300"))

        # ============================================================
        # 日 token 预算熔断（spec: 2026-07-17-llm-module-routing §4.4）
        # 滑动 24h 窗口：无需 cron，重启即清空（生产可接受）
        # ============================================================
        self.daily_token_usage: dict[str, list[tuple[float, int]]] = {}

    # ------------------------------------------------------------------
    #  Key 池 / 熔断器访问
    # ------------------------------------------------------------------

    def _get_key_pool(self, provider_name: str) -> KeyPool:
        """获取 provider 的 key 池（首次访问时从环境变量构建）。"""
        if provider_name not in PROVIDERS:
            raise ValueError(f"未知模型提供商: {provider_name}")
        if provider_name in self.key_pools:
            return self.key_pools[provider_name]

        config = PROVIDERS[provider_name]
        # 自定义模型需要 CUSTOM_BASE_URL
        if provider_name == "custom":
            if not os.getenv("CUSTOM_BASE_URL", ""):
                raise ValueError("CUSTOM_BASE_URL not set")

        raw = os.getenv(config.api_key_env, "")
        keys = [k.strip() for k in raw.split(",") if k.strip()]
        if not keys:
            raise ValueError(
                f"{config.api_key_env} not found in environment. "
                f"请配置 {config.display_name} 的 API Key。"
            )

        rpm = self._parse_rpm(config.api_key_env)
        pool = KeyPool(keys=keys, rpm_limit=rpm)
        self.key_pools[provider_name] = pool
        return pool

    def _parse_rpm(self, api_key_env: str) -> int:
        """从 {API_KEY_ENV}_RPM 读取每 key 的 rpm 限制（0 表示不限）。"""
        val = os.getenv(api_key_env + "_RPM", "0")
        try:
            n = int(val)
            return n if n > 0 else 0
        except ValueError:
            logger.warning(f"非法的 RPM 配置 {api_key_env}_RPM={val!r}，按不限处理")
            return 0

    def _get_circuit_breaker(self, provider_name: str) -> CircuitBreaker:
        if provider_name not in self.circuit_breakers:
            self.circuit_breakers[provider_name] = CircuitBreaker(
                failure_threshold=self._failure_threshold,
                recovery_timeout=self._recovery_timeout,
            )
        return self.circuit_breakers[provider_name]

    def _get_client(self, provider_name: str, key: str) -> AsyncOpenAI:
        """获取指定 (provider, key) 的客户端，按 key 缓存。"""
        if provider_name not in self._clients:
            self._clients[provider_name] = {}
        key_map = self._clients[provider_name]
        if key in key_map:
            return key_map[key]

        config = PROVIDERS[provider_name]
        if provider_name == "custom":
            base_url = os.getenv("CUSTOM_BASE_URL", "")
        else:
            base_url = config.base_url

        client = AsyncOpenAI(api_key=key, base_url=base_url)
        key_map[key] = client
        return client

    # ------------------------------------------------------------------
    #  公共接口
    # ------------------------------------------------------------------

    def get_model_name(self, provider_name: str) -> str:
        """获取指定提供商使用的模型名"""
        config = PROVIDERS[provider_name]
        if provider_name == "custom":
            return os.getenv("CUSTOM_MODEL", "custom-model")
        # 支持环境变量覆盖默认模型
        env_model_key = f"{provider_name.upper()}_MODEL"
        return os.getenv(env_model_key, config.default_model)

    def list_available_providers(self) -> list[dict]:
        """列出所有可用的模型提供商及其状态"""
        result = []
        for name, config in PROVIDERS.items():
            if name == "custom":
                available = bool(
                    os.getenv("CUSTOM_API_KEY") and os.getenv("CUSTOM_BASE_URL")
                )
            else:
                available = bool(os.getenv(config.api_key_env))

            # spec-11: 增加 key_count 与 total_rpm
            try:
                pool = self._get_key_pool(name)
                key_count = len(pool.keys)
                total_rpm = pool.rpm_limit * len(pool.keys) if pool.rpm_limit > 0 else 0
            except ValueError:
                key_count = 0
                total_rpm = 0

            result.append({
                "name": name,
                "display_name": config.display_name,
                "available": available,
                "default_model": self.get_model_name(name),
                "key_count": key_count,
                "total_rpm": total_rpm,
            })
        return result

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        provider: Optional[str] = None,
        module: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """生成文本响应

        Args:
            prompt: 用户输入提示
            system_prompt: 系统提示
            provider: 指定提供商（优先级最高，忽略 module）
            module: 模块名（如 "workspace.writing"），按 MODULE_ROUTES 选 provider 链
            temperature: 温度
            max_tokens: 最大输出 token 数

        Returns:
            LLM 生成的文本
        """
        if provider:
            # 显式指定优先级最高（不检查 budget，由调用方负责）
            return await self._generate_with_provider(
                provider, prompt, system_prompt, temperature, max_tokens
            )

        # 按 module 路由链遍历（替代原来的 primary + fallback）
        providers_to_try = get_module_route(module)
        last_error: Optional[Exception] = None
        skipped_for_budget: list[str] = []

        for prov in providers_to_try:
            # 日 token 预算检查（spec §4.4）
            if self._is_budget_exceeded(prov):
                skipped_for_budget.append(prov)
                continue
            try:
                return await self._generate_with_provider(
                    prov, prompt, system_prompt, temperature, max_tokens
                )
            except ValueError as e:
                # API Key 未配置 / provider 配置错误，跳过此 provider
                logger.debug(f"Skipping {prov}: {e}")
                last_error = e
                continue
            except Exception as e:
                logger.warning(f"{PROVIDERS[prov].display_name} 调用失败，尝试下一个: {e}")
                last_error = e
                continue

        if skipped_for_budget:
            raise RuntimeError(
                f"模块 {module or 'default'} 的所有 provider token budget 超限或不可用: "
                f"超限跳过={skipped_for_budget}, 最后错误={last_error}"
            )
        raise RuntimeError(f"模块 {module or 'default'} 的所有 provider × key 均不可用: {last_error}")

    async def _generate_with_provider(
        self,
        provider_name: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """使用指定提供商生成文本（在该 provider 的 key 池中遍历）"""
        model = self.get_model_name(provider_name)
        messages = self._build_messages(system_prompt, prompt)
        response, _key = await self._call_with_matrix(
            provider_name,
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str = "",
        provider: Optional[str] = None,
        module: Optional[str] = None,
    ) -> dict[str, Any]:
        """生成结构化 JSON 响应

        Args:
            prompt: 用户输入提示
            system_prompt: 系统提示
            provider: 指定提供商（优先级最高）
            module: 模块名，按 MODULE_ROUTES 选 provider 链

        Returns:
            解析后的 JSON 对象
        """
        # 优先尝试 JSON mode
        config = PROVIDERS.get(provider or self.primary_provider)
        if config and config.supports_json_mode:
            try:
                result = await self._generate_json_mode(
                    prompt, system_prompt, provider or self.primary_provider, module=module
                )
                return result
            except Exception as e:
                logger.debug(f"JSON mode failed, falling back to text: {e}")

        # 回退到文本生成 + 手动解析
        text = await self.generate(prompt, system_prompt, provider, module=module)
        return self._parse_json(text)

    async def _generate_json_mode(
        self,
        prompt: str,
        system_prompt: str,
        provider: Optional[str],
        module: Optional[str] = None,
    ) -> dict[str, Any]:
        """使用 JSON mode 生成"""
        provider_name = provider or self.primary_provider
        model = self.get_model_name(provider_name)
        messages = self._build_messages(system_prompt, prompt)
        response, _key = await self._call_with_matrix(
            provider_name,
            model=model,
            messages=messages,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    def _parse_json(self, text: str) -> dict[str, Any]:
        """从文本中解析 JSON"""
        try:
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                text = text[start:end].strip()
            elif "```" in text:
                start = text.find("```") + 3
                end = text.find("```", start)
                text = text[start:end].strip()

            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {e}\n文本: {text[:500]}")
            raise

    def set_primary_provider(self, provider: str):
        """设置主提供商"""
        if provider not in PROVIDERS:
            raise ValueError(f"未知模型提供商: {provider}")
        self.primary_provider = provider

    # ------------------------------------------------------------------
    #  内部：provider × key 矩阵遍历
    # ------------------------------------------------------------------

    @staticmethod
    def _build_messages(system_prompt: str, prompt: str) -> list[dict]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages

    # ------------------------------------------------------------------
    #  日 token 预算熔断（spec: 2026-07-17-llm-module-routing §4.4）
    # ------------------------------------------------------------------

    def _record_token_usage(self, provider: str, total_tokens: int) -> None:
        """记录一次成功调用的 token 用量（带时间戳，滑动窗口）"""
        if provider not in self.daily_token_usage:
            self.daily_token_usage[provider] = []
        self.daily_token_usage[provider].append((time.time(), total_tokens))

    def _get_daily_tokens(self, provider: str) -> int:
        """获取 provider 过去 24h 累计 token（顺带清理过期记录）"""
        if provider not in self.daily_token_usage:
            return 0
        now = time.time()
        cutoff = now - 24 * 3600
        self.daily_token_usage[provider] = [
            (ts, tokens) for ts, tokens in self.daily_token_usage[provider]
            if ts >= cutoff
        ]
        return sum(tokens for _, tokens in self.daily_token_usage[provider])

    def _is_budget_exceeded(self, provider: str) -> bool:
        """检查 provider 是否日 token 超限。未配置预算 = 不限制。"""
        budget_env = f"DAILY_TOKEN_BUDGET_{provider.upper()}"
        budget = os.getenv(budget_env)
        if not budget:
            return False
        try:
            budget_limit = int(budget)
        except ValueError:
            logger.warning(f"无效的 {budget_env} 值: {budget}，忽略")
            return False
        used = self._get_daily_tokens(provider)
        if used >= budget_limit:
            logger.warning(
                f"Provider {provider} 日 token 超限: 已用 {used} / 预算 {budget_limit}，跳过"
            )
            return True
        return False

    async def _call_with_matrix(
        self,
        provider_name: str,
        **call_kwargs,
    ):
        """单 provider 内按 key 池 + 熔断器遍历调用。

        - 跳过熔断中的 key
        - 429 / 网络错误 / 5xx：record_failure 后换下一个 key
        - ValueError（配置错误）：向上抛出（调用方换 provider）
        - 全部 key 不可用：抛出 RuntimeError（含最后一次错误）

        Returns:
            (response, key_used)
        """
        pool = self._get_key_pool(provider_name)
        cb = self._get_circuit_breaker(provider_name)

        last_error: Optional[Exception] = None
        tried_any = False

        for key in pool.available_keys():
            if not await cb.can_call(key):
                logger.debug(f"{provider_name}/{key[:8]}... 熔断中，跳过")
                continue

            tried_any = True
            pool.record_call(key)
            logger.info(f"切换 LLM: {provider_name}/{key[:8]}... (原因: 轮询)")

            try:
                client = self._get_client(provider_name, key)
                response = await client.chat.completions.create(**call_kwargs)
                await cb.record_success(key)
                # 记录 token 用量（spec §4.4）
                try:
                    usage = getattr(response, "usage", None)
                    if usage:
                        total_tokens = getattr(usage, "total_tokens", 0) or 0
                        if total_tokens > 0:
                            self._record_token_usage(provider_name, total_tokens)
                except Exception as e:
                    logger.debug(f"记录 token usage 失败（不影响主流程）: {e}")
                return response, key
            except RateLimitError as e:
                # 429：rpm 触顶，熔断此 key
                await cb.record_failure(key)
                last_error = e
                logger.warning(f"{provider_name}/{key[:8]}... 429 限流，切换 key")
                continue
            except (APIConnectionError, APITimeoutError, InternalServerError, APIStatusError) as e:
                # 网络错误 / 5xx：熔断此 key
                await cb.record_failure(key)
                last_error = e
                logger.warning(
                    f"{provider_name}/{key[:8]}... 调用失败({type(e).__name__})，切换 key"
                )
                continue
            except BadRequestError as e:
                # 400：请求/参数问题（与 key 无关），按 provider 级错误处理
                raise ValueError(f"{provider_name} 请求参数错误: {e}")
            # 其他未知异常向上传播

        # 所有 key 都不可用
        if not tried_any:
            raise ValueError(
                f"{provider_name} 没有可用 key（全部熔断或达 rpm 上限）"
            )
        raise RuntimeError(
            f"{provider_name} 所有 key 调用失败: {last_error}"
        )

    # ------------------------------------------------------------------
    #  健康检查（后台探测）
    # ------------------------------------------------------------------

    async def start_health_check(self) -> None:
        """启动后台健康检查任务（幂等，重复调用不会创建多个任务）。"""
        if self._health_check_task is not None and not self._health_check_task.done():
            return
        self._health_check_task = asyncio.create_task(self._health_check_loop())

    async def _health_check_loop(self) -> None:
        while True:
            try:
                await self._run_health_check()
            except asyncio.CancelledError:
                logger.info("LLM 健康检查任务已取消")
                break
            except Exception as e:
                logger.error(f"LLM 健康检查异常: {e}", exc_info=True)
            await asyncio.sleep(self._health_check_interval)

    async def _run_health_check(self) -> None:
        """对所有已配置 provider 做一次 ping（max_tokens=1，prompt="1"）。"""
        for name, _config in PROVIDERS.items():
            try:
                pool = self._get_key_pool(name)
            except ValueError:
                # 未配置，跳过
                continue

            cb = self._get_circuit_breaker(name)
            keys = pool.available_keys()
            if not keys:
                self.provider_health[name] = {
                    "status": "degraded",
                    "last_check": time.time(),
                    "latency_ms": 0,
                    "error": "no available keys",
                }
                continue

            key = keys[0]
            start = time.time()
            try:
                client = self._get_client(name, key)
                model = self.get_model_name(name)
                await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "1"}],
                    max_tokens=1,
                )
                latency_ms = int((time.time() - start) * 1000)
                self.provider_health[name] = {
                    "status": "healthy",
                    "last_check": time.time(),
                    "latency_ms": latency_ms,
                }
                await cb.record_success(key)
            except Exception as e:
                latency_ms = int((time.time() - start) * 1000)
                self.provider_health[name] = {
                    "status": "down",
                    "last_check": time.time(),
                    "latency_ms": latency_ms,
                    "error": str(e)[:200],
                }
                await cb.record_failure(key)
                logger.warning(f"健康检查: {name} 不可用: {e}")


# ================================================================
#  模块路由配置（spec: 2026-07-17-llm-module-routing）
# ================================================================

MODULE_ROUTES: dict[str, list[str]] = {
    # 工作间 5 个 agent 角色
    "workspace.search":    ["glm", "internlm", "deepseek"],
    "workspace.research":  ["glm", "internlm", "deepseek"],
    "workspace.verify":    ["glm", "internlm", "deepseek"],
    "workspace.writing":   ["glm", "internlm", "deepseek"],
    "workspace.platform":  ["glm", "internlm", "deepseek"],
    # 其他模块
    "xiaowei.chat":        ["glm", "internlm", "deepseek"],
    "verify.pipeline":     ["glm", "internlm", "deepseek"],
    "entertainment.event": ["glm", "internlm", "deepseek"],
    # 兜底
    "default":             ["glm", "internlm", "deepseek"],
}


def get_module_route(module: str | None) -> list[str]:
    """获取模块的 provider 优先级链。None/空/未知 → default。

    Args:
        module: 模块名，如 "workspace.writing"、"verify.pipeline"

    Returns:
        provider 名列表，第一个是 primary，后续是 fallback
    """
    if not module:
        return MODULE_ROUTES["default"]
    return MODULE_ROUTES.get(module, MODULE_ROUTES["default"])


llm_service = LLMService(
    primary_provider=os.getenv("LLM_PROVIDER", "deepseek")
)
