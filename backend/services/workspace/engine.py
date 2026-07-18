# backend/services/workspace/engine.py
"""工作间编排引擎 — 运行时动态构建 DAG"""
import logging
import time
import uuid
from typing import Optional

from langgraph.checkpoint.memory import MemorySaver

from services.workspace.runtime import AgentRuntime
from services.workspace.experience import experience_store
from services.workspace.agents.search_agent import SearchAgent
from services.workspace.agents.research_agent import ResearchAgent
from services.workspace.agents.verify_agent import VerifyAgent
from services.workspace.agents.writing_agent import WritingAgent
from services.workspace.agents.platform_agent import PlatformAgent
from services.workspace.state import WorkspaceState
from services.workspace.strategies.serial import build_serial_graph
from services.workspace.strategies.dag import build_dag_graph

logger = logging.getLogger(__name__)


class WorkspaceEngine:
    """工作间编排引擎"""

    def __init__(self):
        self.runtime = AgentRuntime()
        self.checkpointer = MemorySaver()
        self.agents = {
            "search": SearchAgent(),
            "research": ResearchAgent(),
            "verify": VerifyAgent(),
            "writing": WritingAgent(),
            "platform": PlatformAgent(),
        }

    async def run(
        self,
        workspace_id: str,
        topic: str,
        platform_order: list[str],
        strategy: str = "dag",
        custom_dag: dict | None = None,
    ) -> dict:
        """执行工作间 Pipeline
        评审 #6：MVP 不调用 recommend_strategy（classify_topic 在关键路径浪费 LLM）
        record_run 始终调用，为第二版积累样本
        """
        # 1. 构建 graph（MVP：直接用用户传入的 strategy，不查询经验推荐）
        graph = self._build_graph(strategy, custom_dag)

        # 2. 初始化 state
        initial_state: WorkspaceState = {
            "workspace_id": workspace_id,
            "topic": topic,
            "platform_order": platform_order,
            "strategy": strategy,
            "upstream": {},
            "agent_runs": [],
            "events": [],
            "start_time": time.time(),
            "error": None,
        }

        # 3. 执行
        thread_id = str(uuid.uuid4())
        try:
            result = await graph.ainvoke(
                initial_state,
                config={"configurable": {"thread_id": thread_id}},
            )
            final_result = self._build_final_result(result, workspace_id, strategy)

            # 评审 #6：record_run 在 routes 层调用（engine 不持有 DB session）
            # routes 层拿到 final_result 后调用 experience_store.record_run(ws, agent_runs)
            return final_result
        except Exception as e:
            logger.exception(f"[Workspace {workspace_id}] 执行失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "workspace_id": workspace_id,
                "agent_runs": [],
                "duration_ms": int((time.time() - initial_state["start_time"]) * 1000),
            }

    def _build_graph(self, strategy: str, custom_dag: dict | None = None):
        """根据策略构建 graph"""
        if strategy == "serial":
            return build_serial_graph(self.agents, self.runtime, self.checkpointer)
        elif strategy == "dag":
            return build_dag_graph(self.agents, self.runtime, self.checkpointer)
        else:
            # 未知策略默认 dag
            return build_dag_graph(self.agents, self.runtime, self.checkpointer)

    def _build_final_result(self, state: WorkspaceState, workspace_id: str, strategy: str) -> dict:
        upstream = state.get("upstream", {})
        agent_runs = state.get("agent_runs", [])
        duration_ms = int((time.time() - state.get("start_time", time.time())) * 1000)

        any_degraded = any(v.get("degraded", False) for v in upstream.values())
        writing_data = upstream.get("writing", {})
        platform_data = upstream.get("platform", {})

        return {
            "success": True,
            "partial": any_degraded,
            "workspace_id": workspace_id,
            "strategy": strategy,
            "draft": writing_data.get("draft", {}),
            "platform_contents": platform_data.get("platform_contents", {}),
            "agent_runs": agent_runs,
            "duration_ms": duration_ms,
        }


workspace_engine = WorkspaceEngine()
