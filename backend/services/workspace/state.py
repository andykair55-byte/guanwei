# backend/services/workspace/state.py
"""工作间 Pipeline 状态 — TypedDict"""
from typing import TypedDict, Any


class WorkspaceState(TypedDict, total=False):
    """LangGraph 状态 — 在节点间传递"""
    workspace_id: str
    topic: str
    platform_order: list[str]
    strategy: str

    # agent 间数据 + 降级信号传递通道
    upstream: dict[str, dict[str, Any]]

    agent_runs: list[dict]
    events: list[dict]
    start_time: float
    error: str | None
