# backend/services/workspace/signature.py
"""任务签名 — 让经验可跨主题复用"""
import hashlib
import logging
from datetime import datetime, timedelta

from pipeline.commander import commander

logger = logging.getLogger(__name__)

CATEGORIES = ["科技", "社会", "娱乐", "健康", "财经", "政治", "教育", "体育", "其他"]

_category_cache: dict[str, str] = {}
_CATEGORY_CACHE_TTL = timedelta(hours=24)
_category_cache_time: dict[str, datetime] = {}


async def classify_topic(topic: str) -> str:
    """用 LLM 对主题做分类（24h 内存缓存）

    Returns:
        分类名：科技/社会/娱乐/健康/财经/政治/教育/体育/其他
    """
    cache_key = hashlib.md5(topic.encode()).hexdigest()

    if cache_key in _category_cache:
        cache_time = _category_cache_time.get(cache_key)
        # cache_time 缺失时视为缓存命中（兼容外部预填的缓存值）
        if not cache_time or datetime.utcnow() - cache_time < _CATEGORY_CACHE_TTL:
            return _category_cache[cache_key]

    prompt = f"""请对以下主题做分类，只返回一个分类名，不要其他内容。

主题：{topic}

可选分类：科技、社会、娱乐、健康、财经、政治、教育、体育、其他

只返回一个分类名。"""

    try:
        result = await commander.execute(prompt, agent_type="orchestrator")
        category = result.text.strip()

        if category not in CATEGORIES:
            for c in CATEGORIES:
                if c in category:
                    category = c
                    break
            else:
                category = "其他"
    except Exception as e:
        logger.warning(f"[Signature] 主题分类失败，默认'其他': {e}")
        category = "其他"

    _category_cache[cache_key] = category
    _category_cache_time[cache_key] = datetime.utcnow()

    return category


def compute_task_signature(category: str, platform_order: list[str]) -> str:
    """任务签名 = 分类 + 平台组合（排序无关）

    Example:
        ("科技", ["zhihu", "guanwei"]) → "科技_guanwei+zhihu"
    """
    platforms = "+".join(sorted(platform_order))
    return f"{category}_{platforms}"
