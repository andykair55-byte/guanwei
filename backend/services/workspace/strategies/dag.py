# backend/services/workspace/strategies/dag.py
"""B) 固定 DAG — 部分并行"""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from services.workspace.state import WorkspaceState


async def _fanout_start_node(state: WorkspaceState) -> WorkspaceState:
    """虚拟入口 — 用于 fan-out 到并行节点"""
    return state


async def _join_search_research(state: WorkspaceState) -> WorkspaceState:
    """合并节点 — LangGraph 自动等待所有上游边完成"""
    return state


def build_dag_graph(agents, runtime, checkpointer):
    """
    DAG 结构：
      search ─┐
              ├─→ verify → writing → platform (6 并行)
      research┘
    """
    graph = StateGraph(WorkspaceState)

    graph.add_node("search", runtime.wrap(agents["search"]))
    graph.add_node("research", runtime.wrap(agents["research"]))
    graph.add_node("verify", runtime.wrap(agents["verify"]))
    graph.add_node("writing", runtime.wrap(agents["writing"]))
    graph.add_node("platform", runtime.wrap(agents["platform"]))

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
