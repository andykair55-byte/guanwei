# LLM 模块路由改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 LLM 服务加 per-module provider 路由 + 修 commander 全局污染 + 加书生 InternLM provider

**Architecture:** 在现有 LLMService 单例上加 module 路由层（MODULE_ROUTES 配置 + get_module_route 函数），复用 key 池/熔断器/健康检查；generate/generate_json 加 module 参数按路由链遍历；commander 删掉 set_primary_provider 全局调用，provider 切换改为纯记录（不影响全局）；3 个求证 agent 传 module="verify.pipeline"

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, pytest, unittest.mock.AsyncMock

**Spec:** [docs/superpowers/specs/2026-07-17-llm-module-routing.md](file:///d:/code/code/program/4-观微/docs/superpowers/specs/2026-07-17-llm-module-routing.md)

---

## File Structure

| 文件 | 职责 | 改动类型 |
|---|---|---|
| `backend/services/llm.py` | LLM 服务核心 — 加书生 provider + MODULE_ROUTES + module 参数 | Modify |
| `backend/pipeline/commander.py` | 容错指挥官 — 删 set_primary_provider 全局调用 | Modify |
| `backend/agents/analyzer.py` | 求证分析 agent — 传 module | Modify |
| `backend/agents/moderator.py` | 内容审核 agent — 传 module | Modify |
| `backend/agents/verifier.py` | 内容评分 agent — 传 module | Modify |
| `backend/tests/unit/test_llm_module_routing.py` | module 路由单测 | Create |
| `backend/tests/unit/test_commander_no_pollution.py` | commander 局部切换单测 | Create |

---

## Task 1: 加书生 provider + MODULE_ROUTES 配置

**Files:**
- Modify: `backend/services/llm.py`（PROVIDERS dict 加 internlm；文件末尾加 MODULE_ROUTES + get_module_route）
- Test: `backend/tests/unit/test_llm_module_routing.py`

- [ ] **Step 1: 写失败测试 — 书生 provider 配置 + module 路由**

```python
# backend/tests/unit/test_llm_module_routing.py
"""LLM 模块路由单测（spec: 2026-07-17-llm-module-routing）"""
import pytest
from services.llm import PROVIDERS, MODULE_ROUTES, get_module_route


def test_internlm_provider_configured():
    """书生 InternLM 已在 PROVIDERS 中配置"""
    assert "internlm" in PROVIDERS
    config = PROVIDERS["internlm"]
    assert config.name == "internlm"
    assert config.display_name == "书生 InternLM"
    assert config.base_url == "https://internlm-chat.intern-ai.org.cn/puyu/api/v1"
    assert config.default_model == "internlm2.5-latest"
    assert config.api_key_env == "INTERNLM_API_KEY"
    assert config.is_openai_compatible is True


def test_module_routes_defined():
    """MODULE_ROUTES 覆盖所有已知模块"""
    expected_modules = [
        "workspace.search", "workspace.research", "workspace.verify",
        "workspace.writing", "workspace.platform",
        "xiaowei.chat", "verify.pipeline", "entertainment.event",
        "default",
    ]
    for mod in expected_modules:
        assert mod in MODULE_ROUTES, f"缺少 module: {mod}"
        assert isinstance(MODULE_ROUTES[mod], list)
        assert len(MODULE_ROUTES[mod]) >= 1


def test_all_modules_have_glm_as_primary():
    """所有模块 primary 都是 glm"""
    for mod, providers in MODULE_ROUTES.items():
        assert providers[0] == "glm", f"module {mod} 的 primary 不是 glm: {providers}"


def test_get_module_route_returns_correct_chain():
    """get_module_route 返回正确的 provider 链"""
    assert get_module_route("workspace.writing") == ["glm", "internlm", "deepseek"]
    assert get_module_route("verify.pipeline") == ["glm", "internlm", "deepseek"]
    assert get_module_route("default") == ["glm", "internlm", "deepseek"]


def test_get_module_route_none_returns_default():
    """module=None 返回 default 路由"""
    assert get_module_route(None) == MODULE_ROUTES["default"]


def test_get_module_route_unknown_returns_default():
    """未知 module 返回 default 路由"""
    assert get_module_route("unknown.module") == MODULE_ROUTES["default"]
    assert get_module_route("") == MODULE_ROUTES["default"]
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v`
Expected: FAIL with `ImportError: cannot import name 'MODULE_ROUTES'` 或 `KeyError: 'internlm'`

- [ ] **Step 3: 加书生 provider 到 PROVIDERS**

在 `backend/services/llm.py` 的 PROVIDERS dict 中，`"stepfun"` 之后、`# === 国外模型 ===` 之前插入：

```python
    "internlm": ProviderConfig(
        name="internlm",
        display_name="书生 InternLM",
        base_url="https://internlm-chat.intern-ai.org.cn/puyu/api/v1",
        default_model="internlm2.5-latest",
        api_key_env="INTERNLM_API_KEY",
    ),
```

- [ ] **Step 4: 在文件末尾（`llm_service = LLMService(...)` 之前）加 MODULE_ROUTES**

```python
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
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v`
Expected: 6 passed

- [ ] **Step 6: 提交**

```bash
git add backend/services/llm.py backend/tests/unit/test_llm_module_routing.py
git commit -m "feat(llm): add internlm provider and module routing config"
```

---

## Task 2: generate/generate_json 加 module 参数

**Files:**
- Modify: `backend/services/llm.py`（generate / generate_json / _generate_json_mode 加 module 参数）
- Test: `backend/tests/unit/test_llm_module_routing.py`（追加测试）

- [ ] **Step 1: 追加失败测试 — module 路由遍历逻辑**

在 `backend/tests/unit/test_llm_module_routing.py` 末尾追加：

```python
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from services.llm import LLMService


def _make_mock_response(content: str = "hello"):
    """构造 mock 的 OpenAI chat completion response"""
    resp = MagicMock()
    resp.choices = [MagicMock()]
    resp.choices[0].message.content = content
    return resp


@pytest.mark.asyncio
async def test_generate_with_module_uses_route_chain(monkeypatch):
    """generate(module=...) 按 MODULE_ROUTES 链遍历"""
    svc = LLMService(primary_provider="glm")

    # mock _generate_with_provider：glm 抛异常，internlm 成功
    call_log = []

    async def fake_generate_with_provider(provider_name, prompt, system_prompt, temperature, max_tokens):
        call_log.append(provider_name)
        if provider_name == "glm":
            raise RuntimeError("glm 限流")
        return f"response from {provider_name}"

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    result = await svc.generate("test prompt", module="workspace.writing")

    assert result == "response from internlm"
    assert call_log == ["glm", "internlm"]  # glm 失败后切 internlm


@pytest.mark.asyncio
async def test_generate_without_module_uses_default_chain(monkeypatch):
    """不传 module 时走 default 路由"""
    svc = LLMService(primary_provider="glm")

    call_log = []

    async def fake_generate_with_provider(provider_name, prompt, system_prompt, temperature, max_tokens):
        call_log.append(provider_name)
        return f"ok from {provider_name}"

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    await svc.generate("test prompt")  # 不传 module

    assert call_log == ["glm"]  # default 链第一个是 glm，直接成功


@pytest.mark.asyncio
async def test_generate_all_providers_fail_raises_runtime_error(monkeypatch):
    """所有 provider 都失败 → RuntimeError"""
    svc = LLMService(primary_provider="glm")

    async def fake_generate_with_provider(provider_name, prompt, system_prompt, temperature, max_tokens):
        raise RuntimeError(f"{provider_name} 挂了")

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    with pytest.raises(RuntimeError, match="所有 provider"):
        await svc.generate("test", module="workspace.writing")


@pytest.mark.asyncio
async def test_generate_with_explicit_provider_ignores_module(monkeypatch):
    """显式传 provider 时优先级最高，忽略 module"""
    svc = LLMService(primary_provider="glm")

    call_log = []

    async def fake_generate_with_provider(provider_name, prompt, system_prompt, temperature, max_tokens):
        call_log.append(provider_name)
        return f"ok from {provider_name}"

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    # provider=deepseek + module=workspace.writing → 应该只用 deepseek
    await svc.generate("test", provider="deepseek", module="workspace.writing")

    assert call_log == ["deepseek"]


@pytest.mark.asyncio
async def test_generate_json_with_module(monkeypatch):
    """generate_json 支持 module 参数"""
    svc = LLMService(primary_provider="glm")

    # mock _generate_json_mode 返回成功
    async def fake_generate_json_mode(prompt, system_prompt, provider, module=None):
        return {"result": f"from {provider or 'default'}"}

    monkeypatch.setattr(svc, "_generate_json_mode", fake_generate_json_mode)

    result = await svc.generate_json("test", module="workspace.writing")

    assert result == {"result": "from glm"}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v -k "generate"`
Expected: FAIL with `TypeError: generate() got an unexpected keyword argument 'module'`

- [ ] **Step 3: 改 generate 方法加 module 参数**

在 `backend/services/llm.py` 找到 `async def generate(` 方法，改为：

```python
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
            # 显式指定优先级最高
            return await self._generate_with_provider(
                provider, prompt, system_prompt, temperature, max_tokens
            )

        # 按 module 路由链遍历（替代原来的 primary + fallback）
        providers_to_try = get_module_route(module)
        last_error = None

        for prov in providers_to_try:
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

        raise RuntimeError(f"模块 {module or 'default'} 的所有 provider × key 均不可用: {last_error}")
```

- [ ] **Step 4: 改 generate_json 方法加 module 参数**

找到 `async def generate_json(` 方法，改为：

```python
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
                    prompt, system_prompt, provider, module=module
                )
                return result
            except Exception as e:
                logger.debug(f"JSON mode failed, falling back to text: {e}")

        # 回退到文本生成 + 手动解析
        text = await self.generate(prompt, system_prompt, provider, module=module)
        return self._parse_json(text)
```

- [ ] **Step 5: 改 _generate_json_mode 方法加 module 参数**

找到 `async def _generate_json_mode(` 方法，改为：

```python
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
```

> 注：`_generate_json_mode` 当前只支持单 provider（不遍历链）。如果 provider 失败，上层 `generate_json` 会 fallback 到 `generate()`（带 module 路由链）。这是现有行为，保持不变。

- [ ] **Step 6: 运行测试确认通过**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v`
Expected: 11 passed（6 个 Task 1 的 + 5 个 Task 2 的）

- [ ] **Step 7: 提交**

```bash
git add backend/services/llm.py backend/tests/unit/test_llm_module_routing.py
git commit -m "feat(llm): add module parameter to generate/generate_json for per-module routing"
```

---

## Task 3: commander 删 set_primary_provider 全局污染

**Files:**
- Modify: `backend/pipeline/commander.py`（_switch_to_backup 和 _reset_agent_pool 删 set_primary_provider 调用）
- Test: `backend/tests/unit/test_commander_no_pollution.py`

- [ ] **Step 1: 写失败测试 — commander 切换不污染全局 primary_provider**

```python
# backend/tests/unit/test_commander_no_pollution.py
"""commander 局部切换单测 — 验证不污染 llm_service.primary_provider（spec: 2026-07-17-llm-module-routing §4.2）"""
import pytest
from unittest.mock import MagicMock

from pipeline.commander import Commander
from pipeline.schemas import PipelineState
from services.llm import llm_service


def _make_state(current_provider="glm") -> PipelineState:
    """构造带 agent_pool 的 pipeline state"""
    return {
        "step": "test",
        "events": [],
        "checkpoints": [],
        "user_input": "test",
        "final_result": None,
        "agent_pool": {
            "primary": {"provider": "glm"},
            "backup": [
                {"provider": "internlm"},
                {"provider": "deepseek"},
            ],
            "current_provider": current_provider,
            "fail_count": 0,
            "last_switch_time": None,
        },
    }


def test_switch_to_backup_does_not_pollute_global_primary():
    """评审 #2：commander 切换备用 provider 后，llm_service.primary_provider 不变"""
    original_primary = llm_service.primary_provider
    commander = Commander()
    state = _make_state(current_provider="glm")

    # 触发切换
    switched = commander._switch_to_backup(state)

    assert switched is True
    assert state["agent_pool"]["current_provider"] == "internlm"  # 局部切换
    # 关键断言：全局 primary_provider 不变
    assert llm_service.primary_provider == original_primary


def test_reset_agent_pool_does_not_pollute_global_primary():
    """评审 #2：commander 恢复主 provider 后，llm_service.primary_provider 不变"""
    original_primary = llm_service.primary_provider
    commander = Commander()
    state = _make_state(current_provider="internlm")
    state["agent_pool"]["last_switch_time"] = 0  # 很久以前，触发恢复

    commander._reset_agent_pool(state)

    assert state["agent_pool"]["current_provider"] == "glm"  # 局部恢复
    # 关键断言：全局 primary_provider 不变
    assert llm_service.primary_provider == original_primary


def test_switch_to_backup_still_records_fail_count():
    """切换后 fail_count 递增 + last_switch_time 更新"""
    import time
    commander = Commander()
    state = _make_state(current_provider="glm")

    commander._switch_to_backup(state)

    assert state["agent_pool"]["fail_count"] == 1
    assert state["agent_pool"]["last_switch_time"] is not None


def test_switch_to_backup_emits_event():
    """切换后广播 SWITCH_AGENT 事件"""
    commander = Commander()
    state = _make_state(current_provider="glm")

    commander._switch_to_backup(state)

    events = state["events"]
    switch_events = [e for e in events if e["type"] == "SWITCH_AGENT"]
    assert len(switch_events) == 1
    assert switch_events[0]["details"]["from_provider"] == "glm"
    assert switch_events[0]["details"]["to_provider"] == "internlm"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && pytest tests/unit/test_commander_no_pollution.py -v`
Expected: FAIL — `test_switch_to_backup_does_not_pollute_global_primary` 失败，因为现有 `_switch_to_backup` 会调 `set_primary_provider` 改变全局 primary

- [ ] **Step 3: 改 _switch_to_backup 删 set_primary_provider**

在 `backend/pipeline/commander.py` 找到 `_switch_to_backup` 方法，删除 `llm_service.set_primary_provider(backup["provider"])` 这一行：

```python
    def _switch_to_backup(self, state: PipelineState) -> bool:
        """切换到备用 Agent（局部切换，不污染全局 llm_service）

        评审 #2 加固：删掉 llm_service.set_primary_provider() 全局调用。
        provider 切换只记录在 state["agent_pool"]["current_provider"]，
        实际 LLM 调用的 fallback 由 module 路由链处理。
        """
        agent_pool = state["agent_pool"]
        current_provider = agent_pool["current_provider"]
        backups = agent_pool["backup"]

        for backup in backups:
            if backup["provider"] != current_provider:
                agent_pool["current_provider"] = backup["provider"]
                agent_pool["fail_count"] += 1
                agent_pool["last_switch_time"] = time.time()

                # 不再调 llm_service.set_primary_provider() — 全局污染
                # LLM 调用的 fallback 由 module 路由链处理（spec §4.1）

                self._emit_event(
                    state,
                    "SWITCH_AGENT",
                    "commander",
                    f"切换到备用 Agent: {backup['provider']}",
                    {
                        "from_provider": current_provider,
                        "to_provider": backup["provider"],
                        "fail_count": agent_pool["fail_count"],
                    }
                )
                return True

        return False
```

- [ ] **Step 4: 改 _reset_agent_pool 删 set_primary_provider**

找到 `_reset_agent_pool` 方法，删除 `llm_service.set_primary_provider(primary_provider)` 这一行：

```python
    def _reset_agent_pool(self, state: PipelineState):
        """恢复到主 Agent（冷却后，局部恢复，不污染全局）"""
        agent_pool = state["agent_pool"]
        if agent_pool["last_switch_time"] and (
            time.time() - agent_pool["last_switch_time"] > self.RECOVERY_COOLDOWN
        ):
            primary_provider = agent_pool["primary"]["provider"]
            agent_pool["current_provider"] = primary_provider
            agent_pool["fail_count"] = 0
            agent_pool["last_switch_time"] = None

            # 不再调 llm_service.set_primary_provider() — 全局污染

            self._emit_event(
                state,
                "AGENT_RECOVERED",
                "commander",
                f"恢复到主 Agent: {primary_provider}",
            )
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd backend && pytest tests/unit/test_commander_no_pollution.py -v`
Expected: 4 passed

- [ ] **Step 6: 运行现有 commander 相关测试确认无回归**

Run: `cd backend && pytest tests/ -v -k "commander or pipeline"`
Expected: 全部 PASS（如果有 commander 的现有测试）

- [ ] **Step 7: 提交**

```bash
git add backend/pipeline/commander.py backend/tests/unit/test_commander_no_pollution.py
git commit -m "fix(commander): remove global set_primary_provider pollution, provider switch is now local to pipeline state"
```

---

## Task 4: 求证 agent 传 module="verify.pipeline"

**Files:**
- Modify: `backend/agents/analyzer.py:90`
- Modify: `backend/agents/moderator.py:129`
- Modify: `backend/agents/verifier.py:112`
- Test: `backend/tests/unit/test_verify_agents_module.py`

- [ ] **Step 1: 写失败测试 — 3 个 agent 传 module 参数**

```python
# backend/tests/unit/test_verify_agents_module.py
"""求证 pipeline agent 传 module="verify.pipeline" 单测（spec: 2026-07-17-llm-module-routing §4.3）"""
import pytest
from unittest.mock import AsyncMock, patch

from agents.analyzer import AnalyzerAgent
from agents.moderator import ModeratorAgent
from agents.verifier import VerifierAgent


@pytest.mark.asyncio
async def test_analyzer_passes_module_to_llm():
    """analyzer 调 LLM 时传 module='verify.pipeline'"""
    agent = AnalyzerAgent()

    with patch("agents.analyzer.llm_service.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "timeline": [],
            "evidence_chain": [],
            "key_doubts": [],
            "tendency": "无法判断",
            "tendency_direction": False,
        }
        # 触发 analyzer 的 LLM 调用（需要构造合法 input）
        from agents.models import AnalyzerInput, VerifiedSource
        input_data = AnalyzerInput(
            original_query="test",
            verified_sources=[VerifiedSource(title="t", url="http://t.com", content="c", credibility=3, status="verified")],
        )
        await agent.run(input_data)

        mock_gen.assert_called_once()
        # 检查 module 参数
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs.get("module") == "verify.pipeline"


@pytest.mark.asyncio
async def test_moderator_passes_module_to_llm():
    """moderator 调 LLM 时传 module='verify.pipeline'"""
    agent = ModeratorAgent()

    with patch("agents.moderator.llm_service.generate_json", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"flagged": False, "categories": [], "reasons": []}
        await agent.run({"text": "测试内容"})

        mock_gen.assert_called_once()
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs.get("module") == "verify.pipeline"


@pytest.mark.asyncio
async def test_verifier_passes_module_to_llm():
    """verifier 调 LLM 时传 module='verify.pipeline'"""
    agent = VerifierAgent()

    with patch("agents.verifier.llm_service.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "3"
        await agent.run({"content": "测试内容"})

        mock_gen.assert_called_once()
        call_kwargs = mock_gen.call_args
        assert call_kwargs.kwargs.get("module") == "verify.pipeline"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && pytest tests/unit/test_verify_agents_module.py -v`
Expected: FAIL — `assert call_kwargs.kwargs.get("module") == "verify.pipeline"` 失败，因为现在不传 module

- [ ] **Step 3: 改 analyzer.py 传 module**

在 `backend/agents/analyzer.py` 第 90 行，把：

```python
            result = await llm_service.generate_json(prompt, system_prompt)
```

改为：

```python
            result = await llm_service.generate_json(prompt, system_prompt, module="verify.pipeline")
```

- [ ] **Step 4: 改 moderator.py 传 module**

在 `backend/agents/moderator.py` 第 129 行，把：

```python
            result = await llm_service.generate_json(prompt, system_prompt)
```

改为：

```python
            result = await llm_service.generate_json(prompt, system_prompt, module="verify.pipeline")
```

- [ ] **Step 5: 改 verifier.py 传 module**

在 `backend/agents/verifier.py` 第 112 行，把：

```python
            response = await llm_service.generate(prompt)
```

改为：

```python
            response = await llm_service.generate(prompt, module="verify.pipeline")
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cd backend && pytest tests/unit/test_verify_agents_module.py -v`
Expected: 3 passed

- [ ] **Step 7: 提交**

```bash
git add backend/agents/analyzer.py backend/agents/moderator.py backend/agents/verifier.py backend/tests/unit/test_verify_agents_module.py
git commit -m "feat(agents): pass module='verify.pipeline' to LLM calls in analyzer/moderator/verifier"
```

---

## Task 5: 回归测试 + 集成验证

**Files:**
- Test: 全部现有测试

- [ ] **Step 1: 运行全部 LLM 相关单测**

Run: `cd backend && pytest tests/unit/test_llm_matrix.py tests/unit/test_llm_module_routing.py tests/unit/test_commander_no_pollution.py tests/unit/test_verify_agents_module.py -v`
Expected: 全部 PASS（原有 test_llm_matrix.py 不受影响 + 新增测试全过）

- [ ] **Step 2: 运行全部后端测试确认无回归**

Run: `cd backend && pytest tests/ -v --tb=short`
Expected: 全部 PASS（可能有 skipped，无 failed）

- [ ] **Step 3: 手动验证书生 provider 可用（需配 INTERNLM_API_KEY）**

Run:
```bash
cd backend
python -c "
from services.llm import llm_service
providers = llm_service.list_available_providers()
internlm = [p for p in providers if p['name'] == 'internlm'][0]
print(f'书生 InternLM: available={internlm[\"available\"]}, model={internlm[\"default_model\"]}')
"
```

Expected: 输出 `书生 InternLM: available=True, model=internlm2.5-latest`（需要 INTERNLM_API_KEY 已配置）

> 如果 INTERNLM_API_KEY 未配置，available=False 是正常的，不阻塞。

- [ ] **Step 4: 验证 commander 无全局污染（手动）**

Run:
```bash
cd backend
python -c "
import asyncio
from pipeline.commander import Commander
from services.llm import llm_service
from pipeline.schemas import PipelineState

original = llm_service.primary_provider
state = {
    'step': 'test', 'events': [], 'checkpoints': [], 'user_input': '', 'final_result': None,
    'agent_pool': {
        'primary': {'provider': 'glm'},
        'backup': [{'provider': 'internlm'}, {'provider': 'deepseek'}],
        'current_provider': 'glm', 'fail_count': 0, 'last_switch_time': None,
    },
}
commander = Commander()
commander._switch_to_backup(state)
print(f'切换前 primary: {original}')
print(f'切换后 primary: {llm_service.primary_provider}')
print(f'局部 current_provider: {state[\"agent_pool\"][\"current_provider\"]}')
assert llm_service.primary_provider == original, '全局污染！'
print('✓ 无全局污染')
"
```

Expected: 输出 `✓ 无全局污染`

- [ ] **Step 5: 提交（如果有修复）**

```bash
git add -A
git commit -m "test: regression verification for LLM module routing"
```

> 如果没有需要提交的改动（全部测试通过），跳过此步。

---

## Task 6: daily token budget 熔断

**目标**：防止单 provider 日 token 消耗超限导致后续业务不可用（experience.md §2.8 Token 经济学教训；用户 glm 有 1500w token、书生 9000w token，需要预算保护避免单日耗尽）

**Files:**
- Modify: `backend/services/llm.py`（LLMService.__init__ 加 daily_token_usage；加 _record_token_usage / _get_daily_tokens / _is_budget_exceeded 三个方法；generate 路由遍历前过滤超限 provider；_call_with_matrix 成功后记录 usage）
- Test: `backend/tests/unit/test_llm_module_routing.py`（追加 4 个测试）

- [ ] **Step 1: 写失败测试 — daily budget 熔断**

在 `backend/tests/unit/test_llm_module_routing.py` 末尾追加：

```python
import os
import time
from services.llm import LLMService


@pytest.mark.asyncio
async def test_provider_skipped_when_budget_exceeded(monkeypatch):
    """provider 日 token 超限时被跳过，走下一个 provider"""
    svc = LLMService(primary_provider="glm")

    # 模拟 glm 已用满 1500w
    monkeypatch.setattr(svc, "_get_daily_tokens", lambda p: 15_000_000 if p == "glm" else 0)
    monkeypatch.setenv("DAILY_TOKEN_BUDGET_GLM", "15000000")

    call_log = []

    async def fake_generate_with_provider(provider_name, prompt, system_prompt, temperature, max_tokens):
        call_log.append(provider_name)
        return f"ok from {provider_name}"

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    # glm 超限 → 应该跳过 glm，直接走 internlm
    result = await svc.generate("test", module="workspace.writing")

    assert result == "ok from internlm"
    assert "glm" not in call_log
    assert call_log == ["internlm"]


@pytest.mark.asyncio
async def test_all_providers_budget_exceeded_raises(monkeypatch):
    """所有 provider 都超限 → RuntimeError 提示 budget"""
    svc = LLMService(primary_provider="glm")

    monkeypatch.setattr(svc, "_get_daily_tokens", lambda p: 999_999_999)
    monkeypatch.setenv("DAILY_TOKEN_BUDGET_GLM", "100")
    monkeypatch.setenv("DAILY_TOKEN_BUDGET_INTERNLM", "100")
    monkeypatch.setenv("DAILY_TOKEN_BUDGET_DEEPSEEK", "100")

    async def fake_generate_with_provider(*args, **kwargs):
        raise AssertionError("超限 provider 不应被调用")

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    with pytest.raises(RuntimeError, match="token budget"):
        await svc.generate("test", module="workspace.writing")


def test_daily_token_usage_24h_sliding_window():
    """滑动 24h 窗口：过期记录被清理"""
    svc = LLMService(primary_provider="glm")

    now = time.time()
    svc.daily_token_usage["glm"] = [
        (now - 25 * 3600, 1000),   # 25h 前，应被清理
        (now - 23 * 3600, 2000),   # 23h 前，保留
        (now - 1 * 3600, 3000),    # 1h 前，保留
    ]

    total = svc._get_daily_tokens("glm")

    assert total == 5000
    assert len(svc.daily_token_usage["glm"]) == 2  # 25h 的被清掉


def test_record_token_usage_appends_with_timestamp():
    """成功调用后 token usage 被记录（带时间戳）"""
    svc = LLMService(primary_provider="glm")

    svc._record_token_usage("glm", total_tokens=500)

    assert len(svc.daily_token_usage["glm"]) == 1
    ts, tokens = svc.daily_token_usage["glm"][0]
    assert tokens == 500
    assert abs(ts - time.time()) < 5
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v -k "budget or sliding or token_usage"`
Expected: FAIL with `AttributeError: 'LLMService' object has no attribute '_get_daily_tokens'` 或 `'_record_token_usage'`

- [ ] **Step 3: LLMService.__init__ 加 daily_token_usage 字段**

在 `backend/services/llm.py` 的 `LLMService.__init__` 方法末尾（其他实例属性初始化之后）加：

```python
        # ============================================================
        # 日 token 预算熔断（spec: 2026-07-17-llm-module-routing §4.4）
        # 滑动 24h 窗口：无需 cron，重启即清空（生产可接受）
        # ============================================================
        self.daily_token_usage: dict[str, list[tuple[float, int]]] = {}
```

- [ ] **Step 4: 加 _record_token_usage / _get_daily_tokens / _is_budget_exceeded 三个方法**

在 LLMService 类内（建议放在 `_call_with_matrix` 方法之前）加：

```python
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
```

> `os` 和 `time` 模块在 llm.py 顶部已 import，无需补 import。

- [ ] **Step 5: _call_with_matrix 成功后记录 token usage**

找到 `_call_with_matrix` 方法中的成功分支（`return response, key` 之前），改为：

```python
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
```

- [ ] **Step 6: generate 路由遍历前过滤超限 provider**

修改 Task 2 改过的 `generate` 方法，在遍历 provider 链时加预算检查。完整方法：

```python
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
```

- [ ] **Step 7: 运行 Task 6 测试确认通过**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v -k "budget or sliding or token_usage"`
Expected: 4 passed

- [ ] **Step 8: 运行全量单测确认无回归**

Run: `cd backend && pytest tests/unit/test_llm_module_routing.py -v`
Expected: 全部 passed（Task 1 的 6 + Task 2 的 5 + Task 6 的 4 = 15 passed）

- [ ] **Step 9: 提交**

```bash
git add backend/services/llm.py backend/tests/unit/test_llm_module_routing.py
git commit -m "feat(llm): add daily token budget circuit breaker with 24h sliding window"
```

**.env 配置示例**（部署时加，不在本 Task 范围）：

```bash
# 日 token 预算（experience.md §2.8 Token 经济学保护）
DAILY_TOKEN_BUDGET_GLM=14000000        # glm 预算 1400w（实际有 1500w，留 100w 余量）
DAILY_TOKEN_BUDGET_INTERNLM=85000000   # 书生预算 8500w（实际有 9000w，留 500w 余量）
DAILY_TOKEN_BUDGET_DEEPSEEK=5000000    # deepseek 按需配置
```

---

## Self-Review

### Spec coverage

| Spec 章节 | 覆盖 Task | 状态 |
|---|---|---|
| §1 问题诊断 | （背景说明，无需实现） | ✅ |
| §2 目标 | Task 1-4 + Task 6 全覆盖 | ✅ |
| §3 路由表 | Task 1 MODULE_ROUTES | ✅ |
| §4.1 services/llm.py 加书生 + module 路由 | Task 1, 2 | ✅ |
| §4.2 commander 局部切换 | Task 3 | ✅ |
| §4.3 求证 agent 传 module | Task 4 | ✅ |
| §4.4 保留的 API | 无需改动（admin/routes 保留） | ✅ |
| §4.5 daily token budget 熔断 | Task 6 | ✅ |
| §5 MVP 范围 | Task 1-6 全覆盖 | ✅ |
| §6 不做的事 | 遵守 YAGNI（Task 6 明确不做持久化/精确计费/跨进程） | ✅ |
| §7 验收标准 | Task 5 + Task 6 Step 8 验证 | ✅ |

### Placeholder 扫描

✅ 所有 Step 都有具体代码或具体命令
✅ 无 "TODO" / "TBD" / "implement later"
✅ 测试代码都是可运行的（含完整 import 和 mock）

### 类型一致性检查

- `get_module_route(module: str | None) -> list[str]` 在 Task 1 定义，Task 2、Task 6 使用 ✅
- `generate(module=...)` / `generate_json(module=...)` 在 Task 2 定义，Task 4 使用，Task 6 扩展（加 budget 过滤） ✅
- `MODULE_ROUTES` 在 Task 1 定义，Task 2 引用 ✅
- `internlm` provider 在 Task 1 加入 PROVIDERS，Task 5 验证 ✅
- `daily_token_usage: dict[str, list[tuple[float, int]]]` 在 Task 6 Step 3 定义，Step 4-5 使用 ✅
- `_record_token_usage` / `_get_daily_tokens` / `_is_budget_exceeded` 在 Task 6 Step 4 定义，Step 5-6 使用 ✅
- `DAILY_TOKEN_BUDGET_{PROVIDER}` 环境变量命名在 Task 6 Step 4（读取）、Step 1（测试）、.env 示例三处一致 ✅

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-17-llm-module-routing.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 Task 派发新 subagent，任务间 review，快速迭代

**2. Inline Execution** - 在当前会话批量执行，检查点暂停 review

**Which approach?**
