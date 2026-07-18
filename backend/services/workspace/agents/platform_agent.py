# backend/services/workspace/agents/platform_agent.py
"""平台适配 agent — 6 平台并行"""
import asyncio
import json
from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
)
from services.workspace.config.platform_prompts import PLATFORM_PROMPTS


class PlatformAgent(WorkspaceBaseAgent):
    agent_type = "platform"
    default_timeout = 90

    async def run(self, input_data: WorkspaceAgentInput) -> WorkspaceAgentOutput:
        draft = input_data.upstream.get("writing", {}).get("draft", {})
        platforms = input_data.platform_order

        tasks = [
            self._generate_for_platform(p, draft, input_data.topic)
            for p in platforms
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        platform_contents = {}
        any_degraded = False
        for platform, result in zip(platforms, results):
            if isinstance(result, Exception):
                platform_contents[platform] = self._fallback_single(platform, result)
                any_degraded = True
            else:
                platform_contents[platform] = result
                if result.get("degraded"):
                    any_degraded = True

        return WorkspaceAgentOutput(
            success=True,
            degraded=any_degraded,
            data={"platform_contents": platform_contents},
        )

    async def _generate_for_platform(self, platform: str, draft: dict, topic: str) -> dict:
        from pipeline.commander import commander

        prompt_template = PLATFORM_PROMPTS.get(platform)
        if not prompt_template:
            raise ValueError(f"未知平台: {platform}")

        prompt = prompt_template.format(draft=json.dumps(draft, ensure_ascii=False), topic=topic)
        result = await commander.execute(prompt, agent_type="platform")

        return self._parse_platform_result(result.text, platform)

    def _parse_platform_result(self, text, platform):
        try:
            data = json.loads(text)
            return {
                "title": data.get("title", ""),
                "content": data.get("content", ""),
                "generated": True,
                "degraded": False,
            }
        except Exception:
            return {
                "title": "",
                "content": text,
                "generated": True,
                "degraded": False,
            }

    def _fallback_single(self, platform, error):
        return {
            "title": "",
            "content": f"[{platform} 内容生成失败: {error}]",
            "generated": False,
            "degraded": True,
            "degraded_reason": str(error)[:100],
        }

    async def fallback(self, input_data, error) -> WorkspaceAgentOutput:
        draft = input_data.upstream.get("writing", {}).get("draft", {})
        return WorkspaceAgentOutput(
            success=True,
            degraded=True,
            degraded_reason=f"平台适配整体失败: {str(error)[:100]}",
            data={
                "platform_contents": {
                    p: {
                        "title": draft.get("title", ""),
                        "content": draft.get("summary", ""),
                        "generated": False,
                        "degraded": True,
                    }
                    for p in input_data.platform_order
                }
            },
        )
