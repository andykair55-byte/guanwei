"""审核 Agent - 内容安全审核"""
import re
import logging

from agents.base import BaseAgent, AgentOutput
from agents.models import ModeratorInput, ModeratorOutput, ModerationResult
from services.llm import llm_service

logger = logging.getLogger(__name__)


class ModeratorAgent(BaseAgent):
    """审核 Agent，负责内容安全审核"""

    name = "moderator"

    # 敏感词模式
    SENSITIVE_PATTERNS = {
        "politics": [
            r"国家领导人[姓名]+",
            r"现任.*总书记",
            r"中[南海│央]",
            r"反[动│共]",
        ],
        "violence": [
            r"杀[死│人]",
            r"暴[力│动]",
            r"恐怖[主义]?",
            r"自[杀│爆]",
        ],
        "privacy": [
            r"\d{{11}}",  # 手机号
            r"\d{6}-\d{8}",  # 身份证
            r"姓名.*[小明红丽]",  # 姓名+常见字
        ],
    }

    async def run(self, input_data: ModeratorInput) -> AgentOutput:
        """审核内容安全性

        Args:
            input_data: 包含待审核文本的输入

        Returns:
            审核结果
        """
        try:
            result = await self._moderate(input_data.text)
            return AgentOutput(success=True, data={"result": result.model_dump()})
        except Exception as e:
            logger.error(f"Moderator error: {e}")
            return AgentOutput(success=False, error=str(e))

    async def _moderate(self, text: str) -> ModerationResult:
        """执行审核逻辑"""
        categories = []
        reasons = []

        # 1. 基础正则检测
        basic_result = self._basic_check(text)
        categories.extend(basic_result["categories"])
        reasons.extend(basic_result["reasons"])

        # 2. LLM 深度检测
        llm_result = await self._llm_moderate(text)
        if llm_result["flagged"]:
            categories.extend(llm_result["categories"])
            reasons.extend(llm_result["reasons"])

        # 判断最终结果
        if not categories:
            return ModerationResult(
                passed=True, action="通过", reasons=["内容审核通过"], categories=[]
            )
        elif "politics_extreme" in categories or "violence" in categories:
            return ModerationResult(
                passed=False,
                action="拦截",
                reasons=reasons[:5],
                categories=list(set(categories)),
            )
        else:
            return ModerationResult(
                passed=True,
                action="通过",
                reasons=reasons[:5],
                categories=list(set(categories)),
            )

    def _basic_check(self, text: str) -> dict:
        """基础正则检测"""
        categories = []
        reasons = []

        for category, patterns in self.SENSITIVE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text):
                    categories.append(category)
                    reasons.append(f"检测到敏感词模式: {pattern}")

        return {"categories": categories, "reasons": reasons}

    async def _llm_moderate(self, text: str) -> dict:
        """使用 LLM 进行深度审核"""
        system_prompt = """你是一个内容安全审核专家。检测以下内容是否包含：
1. 政治敏感内容（特别是涉及中国领导人的不当表述）
2. 暴力血腥内容
3. 色情低俗内容
4. 隐私泄露风险（电话号码、身份证号等）
5. 煽动对立言论

请严格把关，谨慎判断。"""

        prompt = f"""请审核以下内容是否存在安全问题：

{text[:1000]}

请以 JSON 格式输出审核结果：
{{
  "flagged": true/false,
  "categories": ["politics", "violence", "porn", "privacy", "incitement"],
  "reasons": ["具体原因"]
}}

如果没有问题，输出：
{{"flagged": false, "categories": [], "reasons": []}}"""

        try:
            result = await llm_service.generate_json(prompt, system_prompt, module="verify.pipeline")
            return {
                "flagged": result.get("flagged", False),
                "categories": result.get("categories", []),
                "reasons": result.get("reasons", []),
            }
        except Exception as e:
            logger.warning(f"LLM moderation failed: {e}")
            return {"flagged": False, "categories": [], "reasons": []}


async def moderate_content(text: str) -> dict:
    """便捷函数：直接审核文本

    Args:
        text: 待审核文本

    Returns:
        审核结果字典，包含 passed, flagged, reason, categories
    """
    agent = ModeratorAgent()
    output = await agent.run(ModeratorInput(text=text))
    if output.success and output.data:
        result = output.data.get("result", {})
        return {
            "passed": result.get("passed", False),
            "flagged": result.get("action") == "待审核",
            "reason": ", ".join(result.get("reasons", [])),
            "categories": result.get("categories", []),
        }
    return {
        "passed": False,
        "flagged": False,
        "reason": output.error or "审核失败",
        "categories": [],
    }


moderator_agent = ModeratorAgent()
