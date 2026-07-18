# backend/services/workspace/agents/writing_agent.py
"""写作 agent — 生成 CanonicalDraft"""
import json
from services.llm import llm_service
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
)


class WritingAgent(WorkspaceBaseAgent):
    agent_type = "writing"
    default_timeout = 60

    async def run(self, input_data: WorkspaceAgentInput) -> WorkspaceAgentOutput:
        verified = input_data.upstream.get("verify", {})
        research = input_data.upstream.get("research", {})

        prompt = self._build_prompt(
            topic=input_data.topic,
            verified_facts=verified.get("verified_facts", []),
            viewpoints=research.get("viewpoints", []),
            degraded_flags={
                "research": research.get("degraded", False),
                "verify": verified.get("degraded", False),
            },
        )
        result = await llm_service.generate(prompt, system_prompt="", module="workspace.writing")
        draft = self._parse_draft(result, input_data.topic)

        return WorkspaceAgentOutput(
            success=True,
            data={"draft": draft},
        )

    def _build_prompt(self, topic, verified_facts, viewpoints, degraded_flags):
        facts_text = "\n".join([f"- {f.get('fact','')}" for f in verified_facts[:5]])
        viewpoints_text = "\n".join([f"- [{v.get('stance','')}]: {v.get('content','')}" for v in viewpoints[:3]])
        degraded_note = ""
        if degraded_flags.get("research"):
            degraded_note += "\n注意：研究阶段降级，观点可能不完整。"
        if degraded_flags.get("verify"):
            degraded_note += "\n注意：核查阶段降级，内容未经验证，需在文中标注。"

        return f"""你是内容创作者。基于以下素材生成 Canonical Draft。

主题：{topic}
{degraded_note}

已核查事实：
{facts_text or "（无）"}

观点：
{viewpoints_text or "（无）"}

输出 JSON：
{{
  "title": "标题（20-50字）",
  "summary": "摘要（100-200字）",
  "sections": [
    {{"heading": "章节标题", "content": "章节内容"}}
  ],
  "metadata": {{"degraded": {bool(degraded_flags)}, "sources_count": {len(verified_facts)}}}
}}"""

    def _parse_draft(self, text, topic):
        try:
            data = json.loads(text)
            return data
        except Exception:
            return {
                "title": topic,
                "summary": text[:200],
                "sections": [{"heading": "内容", "content": text}],
                "metadata": {"degraded": False},
            }

    async def fallback(self, input_data, error) -> WorkspaceAgentOutput:
        return WorkspaceAgentOutput(
            success=True,
            degraded=True,
            degraded_reason=f"写作失败: {str(error)[:100]}",
            data={
                "draft": {
                    "title": input_data.topic,
                    "summary": f"关于「{input_data.topic}」的内容生成受限，仅提供基础框架",
                    "sections": [{"heading": "概述", "content": "由于写作阶段降级，详细内容未生成"}],
                    "metadata": {"degraded": True},
                }
            },
        )
