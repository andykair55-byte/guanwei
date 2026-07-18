# backend/services/workspace/strategies/serial.py
"""A) 串行管线 — 顺序执行"""
import inspect

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from services.workspace.state import WorkspaceState


def _wrap_node(runtime, agent):
    """构建 LangGraph 节点 — 兼容 sync/async runtime.wrap"""
    wrap_result = runtime.wrap(agent)
    if inspect.iscoroutine(wrap_result):
        # async wrap — 需要在节点内 await 拿到真正 node
        async def node_coro(state):
            actual_node = await wrap_result
            return await actual_node(state)
        return node_coro
    # sync wrap — 直接拿到 node
    return wrap_result


def build_serial_graph(agents, runtime, checkpointer):
    """搜索 → 研究 → 核查 → 写作 → 平台"""
    graph = StateGraph(WorkspaceState)

    graph.add_node("search", _wrap_node(runtime, agents["search"]))
    graph.add_node("research", _wrap_node(runtime, agents["research"]))
    graph.add_node("verify", _wrap_node(runtime, agents["verify"]))
    graph.add_node("writing", _wrap_node(runtime, agents["writing"]))
    graph.add_node("platform", _wrap_node(runtime, agents["platform"]))

    graph.set_entry_point("search")
    graph.add_edge("search", "research")
    graph.add_edge("research", "verify")
    graph.add_edge("verify", "writing")
    graph.add_edge("writing", "platform")
    graph.add_edge("platform", END)

    return graph.compile(checkpointer=checkpointer)
