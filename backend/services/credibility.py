"""
信息可信度评估算法

来源分级：
⭐⭐⭐⭐⭐ 政府网站、权威媒体、学术论文
⭐⭐⭐⭐ 正规媒体、知名机构
⭐⭐⭐ 自媒体、论坛
⭐⭐ 未知来源、匿名信息
"""

from typing import Literal

CredibilityLevel = Literal[1, 2, 3, 4, 5]

# 来源类型映射
SOURCE_PATTERNS = {
    # 政府/权威
    "gov.cn": 5,
    "gov.uk": 5,
    "gov": 5,
    "who.int": 5,
    "un.org": 5,

    # 权威媒体
    "xinhua.net": 5,
    "people.com.cn": 5,
    "cctv.com": 5,
    "reuters.com": 5,
    "bbc.com": 4,
    "apnews.com": 4,
    "afp.com": 4,

    # 学术
    "arxiv.org": 5,
    "nature.com": 5,
    "sciencedirect.com": 5,
    "cnki.net": 5,
    "pubmed.ncbi.nlm.nih.gov": 5,

    # 正规媒体
    "sina.com.cn": 4,
    "sohu.com": 4,
    "163.com": 4,
    "qq.com": 4,
    "thepaper.cn": 4,

    # 自媒体
    "weibo.com": 3,
    "twitter.com": 3,
    "x.com": 3,
    "weixin.qq.com": 3,
    "douyin.com": 3,
    "bilibili.com": 3,
}


def get_base_credibility(url: str) -> CredibilityLevel:
    """根据 URL 获取基础可信度"""
    url_lower = url.lower()
    for pattern, level in SOURCE_PATTERNS.items():
        if pattern in url_lower:
            return level
    return 2  # 默认未知来源为 2 星


def evaluate_source_credibility(
    url: str,
    content: str,
    title: str,
    published_at: str | None = None
) -> dict:
    """
    综合评估单个来源的可信度

    返回：
    {
        "credibility": 1-5,
        "status": "verified" | "pending" | "unreliable",
        "reason": str,
        "factors": {
            "source_type": int,
            "content_quality": int,
            "consistency": int
        }
    }
    """
    base = get_base_credibility(url)

    # 内容质量评估（简单启发式）
    content_score = 3  # 默认
    if len(content) > 500:
        content_score += 1
    if any(marker in content for marker in ["据悉", "据报道", "根据调查"]):
        content_score += 0.5
    if len(content) < 50:
        content_score -= 1

    # 时效性（如果有发布时间）
    time_score = 3
    if published_at:
        # 简单处理：假设 published_at 是 ISO 格式
        # 越新的内容分数略高，但不要太高
        time_score = 3.5

    # 综合得分
    final_score = (base * 0.5 + content_score * 0.3 + time_score * 0.2)
    final_score = min(5, max(1, round(final_score)))

    # 确定状态
    if final_score >= 4:
        status = "verified"
        reason = "来源权威，内容可信"
    elif final_score >= 2.5:
        status = "pending"
        reason = "来源可信度一般，需要交叉验证"
    else:
        status = "unreliable"
        reason = "来源可信度低，内容需谨慎判断"

    return {
        "credibility": final_score,
        "status": status,
        "reason": reason,
        "factors": {
            "source_type": base,
            "content_quality": content_score,
            "consistency": time_score
        }
    }


def cross_validate_sources(sources: list[dict]) -> dict:
    """
    交叉验证多个来源的一致性

    多个独立来源相互印证 → 可信度提升
    来源之间矛盾 → 可信度下降
    """
    if not sources:
        return {"consistency_score": 0, "agreement_rate": 0}

    # 简单实现：检查关键信息是否一致
    # 实际应该用 LLM 来做语义级别的比较
    verified_count = sum(1 for s in sources if s.get("status") == "verified")
    total_count = len(sources)

    agreement_rate = verified_count / total_count

    # 交叉验证得分
    if agreement_rate >= 0.8:
        consistency_score = 5
    elif agreement_rate >= 0.6:
        consistency_score = 4
    elif agreement_rate >= 0.4:
        consistency_score = 3
    elif agreement_rate >= 0.2:
        consistency_score = 2
    else:
        consistency_score = 1

    return {
        "consistency_score": consistency_score,
        "agreement_rate": agreement_rate,
        "verified_count": verified_count,
        "total_count": total_count
    }


def calculate_final_tendency(
    sources: list[dict],
    original_claim: str
) -> dict:
    """
    计算最终倾向性判断

    返回：
    {
        "tendency": str,  # 倾向性描述
        "tendency_direction": True,  # True=真, False=假
        "confidence": 0.0-1.0  # 置信度
    }
    """
    if not sources:
        return {
            "tendency": "证据不足，无法判断",
            "tendency_direction": None,
            "confidence": 0.0
        }

    # 计算加权平均可信度
    total_cred = sum(s.get("credibility", 2) for s in sources)
    avg_cred = total_cred / len(sources)

    # 计算证实 vs 证伪的比例
    verified = [s for s in sources if s.get("status") == "verified"]
    unreliable = [s for s in sources if s.get("status") == "unreliable"]

    verified_ratio = len(verified) / len(sources)
    unreliable_ratio = len(unreliable) / len(sources)

    # 综合判断
    if avg_cred >= 4 and verified_ratio >= 0.7:
        direction = True
        confidence = avg_cred / 5 * 0.8 + verified_ratio * 0.2
        tendency = "根据现有证据，信息内容倾向于真实"
    elif unreliable_ratio >= 0.5:
        direction = False
        confidence = unreliable_ratio
        tendency = "根据现有证据，信息内容存在较多疑点，倾向于不实"
    elif avg_cred >= 3:
        direction = True
        confidence = avg_cred / 5
        tendency = "证据表明信息可能属实，但仍需更多佐证"
    else:
        direction = None
        confidence = 0.3
        tendency = "现有证据不足以做出明确判断，建议保持谨慎"

    return {
        "tendency": tendency,
        "tendency_direction": direction,
        "confidence": round(confidence, 2)
    }