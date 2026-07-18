# backend/services/workspace/agents/verify_agent.py
"""核查 agent — 事实核查"""
from services.llm import llm_service
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
)


class VerifyAgent(WorkspaceBaseAgent):
    agent_type = "verify"
    default_timeout = 40

    async def run(self, input_data: WorkspaceAgentInput) -> WorkspaceAgentOutput:
        research = input_data.upstream.get("research", {})
        research_degraded = research.get("degraded", False)
        key_facts = research.get("key_facts", [])

        if research_degraded or not key_facts:
            return WorkspaceAgentOutput(
                success=True,
                degraded=True,
                degraded_reason="上游研究降级，无事实可核查",
                data={"verified_facts": [], "warnings": ["研究阶段降级，核查跳过"]},
            )

        verified = []

        for fact in key_facts[:5]:
            prompt = f"""请核查以下事实的可信度。

主题：{input_data.topic}
待核查事实：{fact}

输出 JSON：
{{
  "fact": "{fact}",
  "credibility": 0.0-1.0,
  "evidence": "支持或反驳的证据",
  "verdict": "confirmed/refuted/uncertain"
}}"""
            result = await llm_service.generate(prompt, system_prompt="", module="workspace.verify")
            verified.append({"fact": fact, "analysis": result})

        return WorkspaceAgentOutput(
            success=True,
            data={"verified_facts": verified, "warnings": []},
        )

    async def fallback(self, input_data, error) -> WorkspaceAgentOutput:
        return WorkspaceAgentOutput(
            success=True,
            degraded=True,
            degraded_reason=f"核查失败: {str(error)[:100]}",
            data={
                "verified_facts": [],
                "warnings": ["核查阶段失败，内容可信度未经验证"],
            },
        )
