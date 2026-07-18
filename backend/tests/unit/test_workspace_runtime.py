# backend/tests/unit/test_workspace_runtime.py
"""AgentRuntime 测试 — 三层容错 + 异常类型驱动重试（评审 #3）"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from services.workspace.runtime import AgentRuntime
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
    RetryableError, NonRetryableError,
)
from services.workspace.state import WorkspaceState


class FlakyAgent(WorkspaceBaseAgent):
    """第一次抛 RetryableError，第二次成功"""
    agent_type = "flaky"
    default_timeout = 1

    def __init__(self):
        self.call_count = 0

    async def run(self, input_data):
        self.call_count += 1
        if self.call_count == 1:
            raise RetryableError("LLM 限流，可重试")
        return WorkspaceAgentOutput(success=True, data={"result": "ok"})

    async def fallback(self, input_data, error):
        return WorkspaceAgentOutput(
            success=True, degraded=True,
            degraded_reason=str(error),
            data={"result": "fallback"},
        )


class AlwaysFailAgent(WorkspaceBaseAgent):
    """持续抛 RetryableError"""
    agent_type = "always_fail"
    default_timeout = 1

    async def run(self, input_data):
        raise RetryableError("持续限流")

    async def fallback(self, input_data, error):
        return WorkspaceAgentOutput(
            success=True, degraded=True,
            degraded_reason=str(error),
            data={"result": "fallback"},
        )


class NonRetryableFailAgent(WorkspaceBaseAgent):
    """抛 NonRetryableError — 不应重试，直接 fallback"""
    agent_type = "non_retryable"
    default_timeout = 1

    def __init__(self):
        self.call_count = 0

    async def run(self, input_data):
        self.call_count += 1
        raise NonRetryableError("prompt 注入拦截")

    async def fallback(self, input_data, error):
        return WorkspaceAgentOutput(
            success=True, degraded=True,
            degraded_reason=str(error),
            data={"result": "fallback"},
            prompt_injection_blocked=True,
        )


class BrokenFallbackAgent(WorkspaceBaseAgent):
    """fallback 也抛异常（违反契约）"""
    agent_type = "broken"
    default_timeout = 1

    async def run(self, input_data):
        raise RuntimeError("run 失败")

    async def fallback(self, input_data, error):
        raise RuntimeError("fallback 也失败")


def _make_state():
    return WorkspaceState(
        workspace_id="ws-test",
        topic="测试",
        platform_order=[],
        upstream={},
        agent_runs=[],
        events=[],
        start_time=0,
        error=None,
    )


@pytest.mark.asyncio
async def test_runtime_retry_then_success():
    """RetryableError → 重试 1 次成功"""
    agent = FlakyAgent()
    runtime = AgentRuntime()
    state = _make_state()

    with patch("services.workspace.runtime.event_bus"):
        result = await runtime._execute_node(agent, state)

    assert result["upstream"]["flaky"]["result"] == "ok"
    assert not result["upstream"]["flaky"]["degraded"]
    assert agent.call_count == 2  # 重试了一次


@pytest.mark.asyncio
async def test_runtime_fallback_on_persistent_failure():
    """持续 RetryableError → 重试后仍失败 → 走 fallback"""
    agent = AlwaysFailAgent()
    runtime = AgentRuntime()
    state = _make_state()

    with patch("services.workspace.runtime.event_bus"):
        result = await runtime._execute_node(agent, state)

    assert result["upstream"]["always_fail"]["degraded"] is True
    assert result["upstream"]["always_fail"]["result"] == "fallback"


@pytest.mark.asyncio
async def test_runtime_non_retryable_skips_retry():
    """评审 #3：NonRetryableError → 不重试，直接 fallback"""
    agent = NonRetryableFailAgent()
    runtime = AgentRuntime()
    state = _make_state()

    with patch("services.workspace.runtime.event_bus"):
        result = await runtime._execute_node(agent, state)

    assert agent.call_count == 1  # 没有重试
    assert result["upstream"]["non_retryable"]["degraded"] is True
    assert result["upstream"]["non_retryable"]["result"] == "fallback"


@pytest.mark.asyncio
async def test_runtime_never_raises_on_broken_fallback():
    """fallback 抛异常 → runtime 兜底，永不抛"""
    agent = BrokenFallbackAgent()
    runtime = AgentRuntime()
    state = _make_state()

    with patch("services.workspace.runtime.event_bus"):
        # 不应抛异常
        result = await runtime._execute_node(agent, state)

    assert result["upstream"]["broken"]["degraded"] is True


@pytest.mark.asyncio
async def test_runtime_writes_agent_runs():
    """runtime 写入 agent_runs 记录"""
    agent = FlakyAgent()
    runtime = AgentRuntime()
    state = _make_state()

    with patch("services.workspace.runtime.event_bus"):
        await runtime._execute_node(agent, state)

    assert len(state["agent_runs"]) == 1
    run = state["agent_runs"][0]
    assert run["agent_type"] == "flaky"
    assert run["status"] == "success"
    assert run["duration_ms"] >= 0
    assert run["retry_count"] == 1


@pytest.mark.asyncio
async def test_runtime_records_prompt_injection_blocked():
    """评审 #5：prompt_injection_blocked 标记透传到 agent_runs"""
    agent = NonRetryableFailAgent()
    runtime = AgentRuntime()
    state = _make_state()

    with patch("services.workspace.runtime.event_bus"):
        await runtime._execute_node(agent, state)

    run = state["agent_runs"][0]
    assert run["prompt_injection_blocked"] is True
