# backend/tests/evaluation/generate_eval_draft.py
"""用 LLM 生成评测集草稿（一次性脚本，生成后人工审核锁定）

使用方法：
    cd backend
    python -m tests.evaluation.generate_eval_draft > eval_draft.json
    # 人工审核 eval_draft.json，筛改后填入 workspace_eval_cases.py
"""
import asyncio
import json
from services.llm import llm_service

CATEGORIES = {
    "科技": ["AI 伦理", "芯片", "量子计算", "新能源", "自动驾驶"],
    "社会": ["教育", "就业", "养老", "医疗", "城市治理"],
    "娱乐": ["影视", "游戏", "音乐"],
    "政策法规": ["数据安全", "平台反垄断", "未成年人保护", "知识产权"],
    "长尾/敏感": ["争议性话题", "小众领域", "边界案例"],
}

PROMPT_TEMPLATE = """你是评测集设计者。为主题"{topic}"（分类：{category}）设计 1 个具体评测 case。

要求：
1. topic 具体化为一个可写标题（如"AI 伦理"→"AI 换脸技术滥用的治理困境"）
2. platforms 从 ["guanwei","zhihu","xiaohongshu","douyin","weibo","bilibili"] 选 2-3 个
3. golden_points：4-5 条"产出必须覆盖的要点"，每条是可检查的事实/角度
4. golden_points 不是标准答案，是"好产出应该覆盖什么"的检查清单

返回 JSON：
{{"id": "{category}-0X", "topic": "...", "category": "{category}", "platforms": [...], "golden_points": [...]}}
"""

async def generate_all():
    cases = []
    for category, topics in CATEGORIES.items():
        for i, topic in enumerate(topics, 1):
            prompt = PROMPT_TEMPLATE.format(topic=topic, category=category)
            result = await llm_service.generate_json(prompt, module="default")
            cases.append(result)
    print(json.dumps(cases, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    asyncio.run(generate_all())
