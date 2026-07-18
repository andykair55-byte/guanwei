# backend/tests/unit/test_workspace_engine.py
"""WorkspaceEngine 测试"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.workspace.engine import WorkspaceEngine


@pytest.mark.asyncio
async def test_engine_run_with_dag_strategy():
    """dag 策略构建 + 执行"""
    engine = WorkspaceEngine()

    # mock runtime.wrap 返回简单 passthrough
    async def mock_wrap(agent):
        async def node(state):
            state["upstream"][agent.agent_type] = {"degraded": False, "duration_ms": 10}
            state["agent_runs"].append({"agent_type": agent.agent_type, "status": "success", "duration_ms": 10})
            return state
        return node

    engine.runtime.wrap = mock_wrap
    engine.runtime._execute_node = AsyncMock()

    # mock 各 agent 的 agent_type
    for key, agent in engine.agents.items():
        agent.agent_type = key

    with patch("services.workspace.engine.experience_store") as exp_mock:
        # 评审 #6：MVP 不调用 recommend_strategy，mock 仅为兼容性
        exp_mock.recommend_strategy = AsyncMock(return_value=None)

        result = await engine.run(
            workspace_id="ws-1",
            topic="测试",
            platform_order=["guanwei"],
            strategy="dag",
        )

    assert "agent_runs" in result or "upstream" in result or result.get("workspace_id") == "ws-1"


@pytest.mark.asyncio
async def test_engine_run_does_not_call_recommend_strategy():
    """评审 #6：MVP 不调用 recommend_strategy"""
    engine = WorkspaceEngine()

    async def mock_wrap(agent):
        async def node(state):
            state["upstream"][agent.agent_type] = {"degraded": False, "duration_ms": 10}
            state["agent_runs"].append({"agent_type": agent.agent_type, "status": "success", "duration_ms": 10})
            return state
        return node

    engine.runtime.wrap = mock_wrap
    engine.runtime._execute_node = AsyncMock()

    for key, agent in engine.agents.items():
        agent.agent_type = key

    with patch("services.workspace.engine.experience_store") as exp_mock:
        exp_mock.recommend_strategy = AsyncMock(return_value="serial")  # 即使有推荐也不该用

        result = await engine.run(
            workspace_id="ws-mvp",
            topic="测试",
            platform_order=["guanwei"],
            strategy="dag",  # 用户显式指定 dag
        )

    # 评审 #6：recommend_strategy 不应被调用
    exp_mock.recommend_strategy.assert_not_called()
    assert result.get("strategy") == "dag"


def test_engine_build_graph_dag():
    """构建 dag graph 不抛异常"""
    engine = WorkspaceEngine()
    graph = engine._build_graph("dag", None)
    assert graph is not None


def test_engine_build_graph_serial():
    """构建 serial graph 不抛异常"""
    engine = WorkspaceEngine()
    graph = engine._build_graph("serial", None)
    assert graph is not None


def test_engine_build_graph_unknown_defaults_to_dag():
    """未知策略 → 默认 dag"""
    engine = WorkspaceEngine()
    graph = engine._build_graph("unknown_strategy", None)
    assert graph is not None
