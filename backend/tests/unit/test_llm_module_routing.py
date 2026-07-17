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
