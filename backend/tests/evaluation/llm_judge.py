# backend/tests/evaluation/llm_judge.py
"""LLM-as-Judge 评分器 — 评估工作间产出质量

评分维度（0-10 分）：
- 内容完整性：是否覆盖 golden_points
- 平台适配性：各平台风格是否区分
- 事实准确性：有无明显错误
- 可读性：结构清晰、语言流畅
"""
import json
from services.llm import llm_service


JUDGE_SYSTEM_PROMPT = """你是一个严格的内容质量评审。你的任务是评估 AI 生成的内容是否满足预期要点。

评分规则：
- 10 分：完全覆盖所有要点，质量优秀
- 8-9 分：覆盖大部分要点，质量良好
- 6-7 分：覆盖部分要点，质量一般
- 4-5 分：覆盖少量要点，质量较差
- 0-3 分：几乎未覆盖要点，质量很差

输出 JSON：{"score": 0-10, "covered_points": ["覆盖的要点"], "missing_points": ["缺失的要点"], "comments": "评语"}"""


async def judge_workspace_output(
    topic: str,
    golden_points: list[str],
    platform_contents: dict,
) -> dict:
    """评估工作间产出质量

    Args:
        topic: 原始主题
        golden_points: 期望覆盖的要点列表
        platform_contents: {platform: {title, content}}

    Returns:
        {"score": int, "covered_points": [], "missing_points": [], "comments": str}
    """
    # 拼接所有平台内容供评审
    contents_text = ""
    for platform, data in platform_contents.items():
        contents_text += f"\n\n=== {platform} ===\n标题：{data.get('title', '')}\n内容：{data.get('content', '')[:500]}..."

    prompt = f"""请评估以下工作间产出：

主题：{topic}

期望覆盖的要点：
{chr(10).join(f'- {p}' for p in golden_points)}

产出内容：
{contents_text}

请按评分规则给出 JSON 评分。"""

    try:
        result = await llm_service.generate_json(
            prompt,
            system_prompt=JUDGE_SYSTEM_PROMPT,
            module="default",  # 评审用 default 路由
        )
        return {
            "score": int(result.get("score", 0)),
            "covered_points": result.get("covered_points", []),
            "missing_points": result.get("missing_points", []),
            "comments": result.get("comments", ""),
        }
    except Exception as e:
        return {
            "score": 0,
            "covered_points": [],
            "missing_points": golden_points,
            "comments": f"评审失败: {e}",
        }
