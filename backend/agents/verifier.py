"""验证 Agent - 评估来源可信度"""
import logging

from agents.base import BaseAgent, AgentOutput
from agents.models import VerifierInput, VerifierOutput, VerifiedSource, SourceItem
from services.llm import llm_service
from services.credibility import (
    evaluate_source_credibility,
    cross_validate_sources,
    calculate_final_tendency
)

logger = logging.getLogger(__name__)


class VerifierAgent(BaseAgent):
    """验证 Agent，负责评估来源可信度"""

    name = "verifier"

    # 权威来源白名单及权重
    AUTHORITATIVE_DOMAINS = {
        "gov.cn": 5,
        "edu.cn": 5,
        "org.cn": 4,
        "xinhua.net": 5,
        "xinhuanet.com": 5,
        "people.com.cn": 5,
        "cna.com.cn": 4,
        "bbc.com": 4,
        "reuters.com": 4,
        "apnews.com": 4,
        "nytimes.com": 4,
        "wikipedia.org": 3,
        "baidu.com": 2,
    }

    async def run(self, input_data: VerifierInput) -> AgentOutput:
        """验证来源可信度

        Args:
            input_data: 包含待验证来源列表的输入

        Returns:
            验证后的来源列表
        """
        try:
            verified_sources = []
            for source in input_data.sources:
                verified = await self._verify_source(source)
                verified_sources.append(verified)

            return AgentOutput(
                success=True,
                data={"verified_sources": [s.model_dump() for s in verified_sources]}
            )
        except Exception as e:
            logger.error(f"Verifier error: {e}")
            return AgentOutput(success=False, error=str(e))

    async def _verify_source(self, source: SourceItem) -> VerifiedSource:
        """验证单个来源"""
        # 使用可信度评估算法
        result = evaluate_source_credibility(
            url=source.url,
            content=source.content or "",
            title=source.title or "",
            published_at=source.published_at
        )

        # 映射状态到中文
        status_map = {
            "verified": "已核实",
            "pending": "待核实",
            "unreliable": "不可信"
        }
        status = status_map.get(result["status"], "待核实")

        return VerifiedSource(
            url=source.url,
            title=source.title,
            content=source.content[:2000] if source.content else "",
            credibility=result["credibility"],
            status=status,
            reason=result["reason"]
        )

    def _get_domain_credibility(self, url: str) -> int:
        """根据域名判断权威性"""
        url_lower = url.lower()
        for domain, score in self.AUTHORITATIVE_DOMAINS.items():
            if domain in url_lower:
                return score
        return 2  # 默认分数

    async def _analyze_content(self, content: str) -> int:
        """使用 LLM 分析内容质量"""
        try:
            prompt = f"""分析以下内容的信息质量，评估其是否可信、是否有价值。
评分标准：
- 5分：内容详细、客观、有具体数据和来源
- 4分：内容较详细、较客观
- 3分：内容一般、主客观参半
- 2分：内容较少、主观性强
- 1分：内容极少、充满主观判断或情绪化语言

内容：
{content[:2000]}

请直接输出一个 1-5 的数字分数，不要其他内容。"""

            response = await llm_service.generate(prompt)
            score = int(response.strip()[0]) if response.strip() else 3
            return max(1, min(5, score))
        except Exception as e:
            logger.warning(f"Content analysis failed: {e}")
            return 3


verifier_agent = VerifierAgent()
