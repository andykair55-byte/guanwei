"""多模型 LLM 服务封装

支持的模型提供商：
- 国产：GLM(智谱)、DeepSeek、Qwen(通义千问)、Kimi(月之暗面)、
        豆包(Doubao/火山引擎)、MiniMax、StepFun(阶跃星辰)
- 国外：Claude(Anthropic)、OpenAI、Gemini(Google)、Groq
- 自定义：支持 OpenAI 兼容接口

统一使用 OpenAI 兼容 SDK 调用，无需为每家单独写适配。
"""
import os
import json
import logging
from typing import Any, Optional
from dataclasses import dataclass

from dotenv import load_dotenv
from openai import AsyncOpenAI

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


class LLMService:
    """多模型 LLM 服务类

    支持切换任意已配置的模型提供商，统一接口调用。
    支持降级回退：主模型失败时自动尝试备用模型。
    """

    def __init__(self, primary_provider: str = "deepseek"):
        self._clients: dict[str, AsyncOpenAI] = {}
        self.primary_provider = primary_provider
        self.fallback_providers = ["groq", "openai", "claude"]

    def _get_client(self, provider_name: str) -> AsyncOpenAI:
        """获取指定提供商的客户端"""
        if provider_name not in PROVIDERS:
            raise ValueError(f"未知模型提供商: {provider_name}")

        if provider_name in self._clients:
            return self._clients[provider_name]

        config = PROVIDERS[provider_name]

        # 自定义模型从环境变量读取 base_url 和 model
        if provider_name == "custom":
            base_url = os.getenv("CUSTOM_BASE_URL", "")
            if not base_url:
                raise ValueError("CUSTOM_BASE_URL not set")
            api_key = os.getenv("CUSTOM_API_KEY", "")
        else:
            base_url = config.base_url
            api_key = os.getenv(config.api_key_env, "")

        if not api_key:
            raise ValueError(
                f"{config.api_key_env} not found in environment. "
                f"请配置 {config.display_name} 的 API Key。"
            )

        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self._clients[provider_name] = client
        return client

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

            result.append({
                "name": name,
                "display_name": config.display_name,
                "available": available,
                "default_model": self.get_model_name(name),
            })
        return result

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        provider: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """生成文本响应

        Args:
            prompt: 用户输入提示
            system_prompt: 系统提示
            provider: 指定提供商，None 则使用主提供商 + 自动降级
            temperature: 温度
            max_tokens: 最大输出 token 数

        Returns:
            LLM 生成的文本
        """
        if provider:
            return await self._generate_with_provider(
                provider, prompt, system_prompt, temperature, max_tokens
            )

        # 主提供商 + 自动降级
        providers_to_try = [self.primary_provider] + self.fallback_providers
        last_error = None

        for prov in providers_to_try:
            try:
                return await self._generate_with_provider(
                    prov, prompt, system_prompt, temperature, max_tokens
                )
            except ValueError as e:
                # API Key 未配置，跳过
                logger.debug(f"Skipping {prov}: {e}")
                last_error = e
                continue
            except Exception as e:
                logger.warning(f"{PROVIDERS[prov].display_name} 调用失败，尝试下一个: {e}")
                last_error = e
                continue

        raise RuntimeError(f"所有模型均调用失败: {last_error}")

    async def _generate_with_provider(
        self,
        provider_name: str,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """使用指定提供商生成文本"""
        client = self._get_client(provider_name)
        model = self.get_model_name(provider_name)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
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
    ) -> dict[str, Any]:
        """生成结构化 JSON 响应

        Args:
            prompt: 用户输入提示
            system_prompt: 系统提示
            provider: 指定提供商

        Returns:
            解析后的 JSON 对象
        """
        # 优先尝试 JSON mode
        config = PROVIDERS.get(provider or self.primary_provider)
        if config and config.supports_json_mode:
            try:
                result = await self._generate_json_mode(
                    prompt, system_prompt, provider
                )
                return result
            except Exception as e:
                logger.debug(f"JSON mode failed, falling back to text: {e}")

        # 回退到文本生成 + 手动解析
        text = await self.generate(prompt, system_prompt, provider)
        return self._parse_json(text)

    async def _generate_json_mode(
        self,
        prompt: str,
        system_prompt: str,
        provider: Optional[str],
    ) -> dict[str, Any]:
        """使用 JSON mode 生成"""
        provider_name = provider or self.primary_provider
        client = self._get_client(provider_name)
        model = self.get_model_name(provider_name)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
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


llm_service = LLMService(
    primary_provider=os.getenv("LLM_PROVIDER", "deepseek")
)
