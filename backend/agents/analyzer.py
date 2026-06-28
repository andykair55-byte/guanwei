"""分析 Agent - 生成分析报告"""
import logging
from datetime import datetime

from agents.base import BaseAgent, AgentOutput
from agents.models import (
    AnalyzerInput,
    AnalyzerOutput,
    AnalysisResult,
    TimelineItem,
    EvidenceItem,
    VerifiedSource,
)
from services.llm import llm_service

logger = logging.getLogger(__name__)


class AnalyzerAgent(BaseAgent):
    """分析 Agent，负责生成结构化分析报告"""

    name = "analyzer"

    async def run(self, input_data: AnalyzerInput) -> AgentOutput:
        """分析信息真伪

        Args:
            input_data: 包含原始查询和已验证来源的输入

        Returns:
            结构化分析结果
        """
        try:
            # 使用 LLM 生成分析
            analysis_result = await self._generate_analysis(
                input_data.original_query, input_data.verified_sources
            )

            return AgentOutput(
                success=True,
                data={"result": analysis_result.model_dump()}
            )
        except Exception as e:
            logger.error(f"Analyzer error: {e}")
            return AgentOutput(success=False, error=str(e))

    async def _generate_analysis(
        self, query: str, sources: list[VerifiedSource]
    ) -> AnalysisResult:
        """生成分析结果"""
        # 构建来源摘要
        sources_summary = []
        for i, s in enumerate(sources, 1):
            sources_summary.append(
                f"{i}. [{s.title}]({s.url}) - 可信度: {s.credibility}星 ({s.status})\n"
                f"   内容: {s.content[:300]}..."
            )

        sources_text = "\n".join(sources_summary)

        system_prompt = """你是一个专业的事实核查专家。你的任务是分析给定的信息来源，判断某个声明或信息的真伪。
请保持客观中立，基于证据给出判断。"""

        prompt = f"""请分析以下信息的真伪：

原始查询：{query}

已收集的信息来源：
{sources_text}

请生成一个结构化的分析报告，包含：
1. 事件时间线（如有）
2. 证据链梳理
3. 主要疑点
4. 倾向性判断（真/假/存疑/无法判断）

请以 JSON 格式输出：
{{
  "timeline": [{{"time": "时间点", "event": "事件描述", "source": "来源"}}],
  "evidence_chain": [{{"description": "证据描述", "source": "来源名称", "source_url": "来源链接", "credibility": 1-5}}],
  "key_doubts": ["疑点1", "疑点2"],
  "tendency": "倾向性描述",
  "tendency_direction": true,
  "disclaimer": "AI核查仅供参考，不构成任何建议"
}}

注意：tendency_direction 为 true 表示倾向于真，false 表示倾向于假。"""

        try:
            result = await llm_service.generate_json(prompt, system_prompt)

            # 解析 timeline
            timeline_data = result.get("timeline", [])
            timeline = [
                TimelineItem(
                    time=item.get("time", ""),
                    event=item.get("event", ""),
                    source=item.get("source", "")
                ) for item in timeline_data
            ]

            # 解析 evidence_chain
            evidence_data = result.get("evidence_chain", [])
            evidence_chain = [
                EvidenceItem(
                    description=item.get("description", ""),
                    source=item.get("source", ""),
                    source_url=item.get("source_url", ""),
                    credibility=item.get("credibility", 3)
                ) for item in evidence_data
            ]

            # 解析 key_doubts
            key_doubts = result.get("key_doubts", [])

            # 解析 tendency
            tendency = result.get("tendency", "无法判断")
            tendency_direction = result.get("tendency_direction", True)

            return AnalysisResult(
                timeline=timeline,
                evidence_chain=evidence_chain,
                key_doubts=key_doubts,
                tendency=tendency,
                tendency_direction=tendency_direction,
            )
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            # 返回一个默认结果
            return AnalysisResult(
                timeline=[],
                evidence_chain=[],
                key_doubts=["分析生成失败"],
                tendency="无法判断",
                tendency_direction=False,
            )


analyzer_agent = AnalyzerAgent()
