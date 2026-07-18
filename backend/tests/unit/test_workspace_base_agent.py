"""WorkspaceBaseAgent 测试"""
import pytest
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent,
    WorkspaceAgentInput,
    WorkspaceAgentOutput,
    RetryableError,
    NonRetryableError,
    compute_prompt_hash,
)


class MockAgent(WorkspaceBaseAgent):
    agent_type = "mock"
    default_timeout = 1

    async def run(self, input_data):
        return WorkspaceAgentOutput(success=True, data={"result": "ok"})

    async def fallback(self, input_data, error):
        return WorkspaceAgentOutput(
            success=True, degraded=True,
            degraded_reason=str(error),
            data={"result": "fallback"},
        )


@pytest.mark.asyncio
async def test_safe_run_success():
    """run 成功 → 直接返回"""
    agent = MockAgent()
    input_data = WorkspaceAgentInput(workspace_id="ws", topic="t", platform_order=[], upstream={})

    result = await agent.safe_run(input_data)

    assert result.success is True
    assert result.degraded is False
    assert result.data["result"] == "ok"


@pytest.mark.asyncio
async def test_safe_run_fallback_on_exception():
    """run 抛异常 → 走 fallback"""
    agent = MockAgent()
    agent.run = lambda input_data: (_ for _ in ()).throw(RuntimeError("boom"))
    input_data = WorkspaceAgentInput(workspace_id="ws", topic="t", platform_order=[], upstream={})

    result = await agent.safe_run(input_data)

    assert result.degraded is True
    assert "boom" in result.degraded_reason
    assert result.data["result"] == "fallback"


def test_workspace_agent_input_upstream():
    """upstream 字段默认空 dict"""
    inp = WorkspaceAgentInput(workspace_id="ws", topic="t", platform_order=[])
    assert inp.upstream == {}


def test_workspace_agent_output_degraded_default():
    """degraded 默认 False"""
    out = WorkspaceAgentOutput(success=True)
    assert out.degraded is False
    assert out.degraded_reason == ""
    assert out.prompt_hash == ""


# 评审 #3：异常分类测试
def test_retryable_error_is_exception():
    """RetryableError 是 Exception 子类"""
    err = RetryableError("timeout")
    assert isinstance(err, Exception)


def test_non_retryable_error_is_exception():
    """NonRetryableError 是 Exception 子类"""
    err = NonRetryableError("invalid input")
    assert isinstance(err, Exception)


def test_retryable_and_non_retryable_are_distinct():
    """两种异常类型不互为子类"""
    assert not issubclass(RetryableError, NonRetryableError)
    assert not issubclass(NonRetryableError, RetryableError)


# 评审 #5：prompt_hash 测试
def test_compute_prompt_hash_is_16_chars():
    """prompt_hash 是 sha256 前 16 位"""
    h = compute_prompt_hash("test prompt")
    assert len(h) == 16
    assert all(c in "0123456789abcdef" for c in h)


def test_compute_prompt_hash_deterministic():
    """相同 prompt 返回相同 hash"""
    h1 = compute_prompt_hash("same prompt")
    h2 = compute_prompt_hash("same prompt")
    assert h1 == h2


def test_compute_prompt_hash_different_for_different_prompts():
    """不同 prompt 返回不同 hash"""
    h1 = compute_prompt_hash("prompt A")
    h2 = compute_prompt_hash("prompt B")
    assert h1 != h2
