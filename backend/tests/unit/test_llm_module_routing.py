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
    assert get_module_route("workspace.writing") == ["glm", "groq", "internlm", "deepseek"]
    assert get_module_route("verify.pipeline") == ["glm", "groq", "internlm", "deepseek"]
    assert get_module_route("default") == ["glm", "groq", "internlm", "deepseek"]


def test_get_module_route_none_returns_default():
    """module=None 返回 default 路由"""
    assert get_module_route(None) == MODULE_ROUTES["default"]


def test_get_module_route_unknown_returns_default():
    """未知 module 返回 default 路由"""
    assert get_module_route("unknown.module") == MODULE_ROUTES["default"]
    assert get_module_route("") == MODULE_ROUTES["default"]


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

    # mock _generate_with_provider：glm 抛异常，groq 成功
    call_log = []

    async def fake_generate_with_provider(provider_name, prompt, system_prompt, temperature, max_tokens):
        call_log.append(provider_name)
        if provider_name == "glm":
            raise RuntimeError("glm 限流")
        return f"response from {provider_name}"

    monkeypatch.setattr(svc, "_generate_with_provider", fake_generate_with_provider)

    result = await svc.generate("test prompt", module="workspace.writing")

    assert result == "response from groq"
    assert call_log == ["glm", "groq"]  # glm 失败后切 groq


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


import os
import time


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

    # glm 超限 → 应该跳过 glm，直接走 groq
    result = await svc.generate("test", module="workspace.writing")

    assert result == "ok from groq"
    assert "glm" not in call_log
    assert call_log == ["groq"]


@pytest.mark.asyncio
async def test_all_providers_budget_exceeded_raises(monkeypatch):
    """所有 provider 都超限 → RuntimeError 提示 budget"""
    svc = LLMService(primary_provider="glm")

    monkeypatch.setattr(svc, "_get_daily_tokens", lambda p: 999_999_999)
    monkeypatch.setenv("DAILY_TOKEN_BUDGET_GLM", "100")
    monkeypatch.setenv("DAILY_TOKEN_BUDGET_GROQ", "100")
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
