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
