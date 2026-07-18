# backend/services/workspace/strategies/serial.py
"""A) 串行管线 — 顺序执行"""
import inspect

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from services.workspace.state import WorkspaceState


def _make_node(runtime, agent):
    """构建 LangGraph 节点 — 兼容 sync/async runtime.wrap
    runtime.wrap 在 runtime.py 中是 async def（返回 coroutine），
    但 LangGraph add_node 期望 callable。这里在节点内部 await wrap 得到真正 node。
    """
    wrap = runtime.wrap
    if inspect.iscoroutinefunction(wrap):
        async def node(state):
            actual_node = await wrap(agent)
            return await actual_node(state)
        return node
    return wrap(agent)


def build_serial_graph(agents, runtime, checkpointer):
    """搜索 → 研究 → 核查 → 写作 → 平台"""
    graph = StateGraph(WorkspaceState)

    graph.add_node("search", _make_node(runtime, agents["search"]))
    graph.add_node("research", _make_node(runtime, agents["research"]))
    graph.add_node("verify", _make_node(runtime, agents["verify"]))
    graph.add_node("writing", _make_node(runtime, agents["writing"]))
    graph.add_node("platform", _make_node(runtime, agents["platform"]))

    graph.set_entry_point("search")
    graph.add_edge("search", "research")
    graph.add_edge("research", "verify")
    graph.add_edge("verify", "writing")
    graph.add_edge("writing", "platform")
    graph.add_edge("platform", END)

    return graph.compile(checkpointer=checkpointer)
