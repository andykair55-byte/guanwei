# backend/services/workspace/strategies/serial.py
"""A) 串行管线 — 顺序执行"""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from services.workspace.state import WorkspaceState


def build_serial_graph(agents, runtime, checkpointer):
    """搜索 → 研究 → 核查 → 写作 → 平台"""
    graph = StateGraph(WorkspaceState)

    graph.add_node("search", runtime.wrap(agents["search"]))
    graph.add_node("research", runtime.wrap(agents["research"]))
    graph.add_node("verify", runtime.wrap(agents["verify"]))
    graph.add_node("writing", runtime.wrap(agents["writing"]))
    graph.add_node("platform", runtime.wrap(agents["platform"]))

    graph.set_entry_point("search")
    graph.add_edge("search", "research")
    graph.add_edge("research", "verify")
    graph.add_edge("verify", "writing")
    graph.add_edge("writing", "platform")
    graph.add_edge("platform", END)

    return graph.compile(checkpointer=checkpointer)
