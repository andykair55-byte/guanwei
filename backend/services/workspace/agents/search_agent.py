# backend/services/workspace/agents/search_agent.py
"""搜索 agent — 复用 CollectorAgent 搜索逻辑"""
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
)


class SearchAgent(WorkspaceBaseAgent):
    agent_type = "search"
    default_timeout = 30

    async def run(self, input_data: WorkspaceAgentInput) -> WorkspaceAgentOutput:
        try:
            from agents.collector import collector_agent
            sources = await collector_agent._collect_sources(
                input_data.topic, max_sources=8
            )
            return WorkspaceAgentOutput(
                success=True,
                data={"sources": [s.model_dump() if hasattr(s, 'model_dump') else s for s in sources]},
            )
        except Exception as e:
            return WorkspaceAgentOutput(
                success=False,
                error=f"搜索失败: {e}",
            )

    async def fallback(self, input_data, error) -> WorkspaceAgentOutput:
        return WorkspaceAgentOutput(
            success=True,
            degraded=True,
            degraded_reason=f"搜索失败: {str(error)[:100]}",
            data={"sources": []},
        )
