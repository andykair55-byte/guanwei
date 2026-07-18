# backend/services/workspace/strategies/dag.py
"""B) 固定 DAG — 部分并行

search/research 并行 → verify → writing → platform

DAG 专用 state 用合并 reducer 解决并发写入冲突：
- upstream: dict 合并（_merge_upstream）
- agent_runs/events: list append（operator.add）
节点返回 diff（只含修改字段），避免未修改字段触发并发更新。
"""
import copy
import inspect
from operator import add
from typing import Annotated, TypedDict

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from services.workspace.state import WorkspaceState


async def _fanout_start_node(state: WorkspaceState) -> WorkspaceState:
    """虚拟入口 — 用于 fan-out 到并行节点"""
    return state


async def _join_search_research(state: WorkspaceState) -> WorkspaceState:
    """合并节点 — LangGraph 自动等待所有上游边完成"""
    return state


def _merge_upstream(left: dict | None, right: dict | None) -> dict:
    """合并 upstream — DAG 中 search/research 并行写入需要合并 reducer"""
    if not left:
        return right or {}
    if not right:
        return left
    return {**left, **right}


class _DagWorkspaceState(TypedDict, total=False):
    """DAG 专用 state schema — 带并发合并 reducer"""
    workspace_id: str
    topic: str
    platform_order: list[str]
    strategy: str
    upstream: Annotated[dict, _merge_upstream]
    agent_runs: Annotated[list, add]
    events: Annotated[list, add]
    start_time: float
    error: str | None


def _compute_diff(before: dict, after: dict | None) -> dict:
    """计算 before → after 的 diff，用于 LangGraph update
    避免节点返回整个 state 时，未修改字段触发并发更新冲突。
    list 字段返回新增部分（假设只 append），dict 字段返回合并后的值。
    """
    if after is None:
        return {}
    diff = {}
    for k, v in after.items():
        old = before.get(k)
        if isinstance(v, list) and isinstance(old, list) and v != old:
            if len(v) > len(old) and v[:len(old)] == old:
                diff[k] = v[len(old):]
            else:
                diff[k] = v
        elif v != old:
            diff[k] = v
    return diff


def _wrap_node(runtime, agent):
    """构建 LangGraph 节点 — 包装 runtime.wrap 并返回 diff
    兼容 sync wrap（返回 callable）和 async wrap（返回 coroutine）。
    """
    wrap_result = runtime.wrap(agent)
    if inspect.iscoroutine(wrap_result):
        # async wrap — 需要在节点内 await 拿到真正 node
        async def node_coro(state):
            actual_node = await wrap_result
            before = copy.deepcopy(state)
            new_state = await actual_node(state)
            return _compute_diff(before, new_state)
        return node_coro

    # sync wrap — 直接拿到 node
    node_func = wrap_result

    async def node(state):
        before = copy.deepcopy(state)
        new_state = await node_func(state)
        return _compute_diff(before, new_state)

    return node


def build_dag_graph(agents, runtime, checkpointer):
    """
    DAG 结构：
      search ─┐
              ├─→ verify → writing → platform (6 并行)
      research┘
    """
    graph = StateGraph(_DagWorkspaceState)

    graph.add_node("search", _wrap_node(runtime, agents["search"]))
    graph.add_node("research", _wrap_node(runtime, agents["research"]))
    graph.add_node("verify", _wrap_node(runtime, agents["verify"]))
    graph.add_node("writing", _wrap_node(runtime, agents["writing"]))
    graph.add_node("platform", _wrap_node(runtime, agents["platform"]))

    # 虚拟入口节点：并行启动 search 和 research
    graph.add_node("__start_fanout", _fanout_start_node)
    graph.set_entry_point("__start_fanout")
    graph.add_edge("__start_fanout", "search")
    graph.add_edge("__start_fanout", "research")

    # 合并节点
    graph.add_node("__join_search_research", _join_search_research)
    graph.add_edge("search", "__join_search_research")
    graph.add_edge("research", "__join_search_research")
    graph.add_edge("__join_search_research", "verify")

    graph.add_edge("verify", "writing")
    graph.add_edge("writing", "platform")
    graph.add_edge("platform", END)

    return graph.compile(checkpointer=checkpointer)
