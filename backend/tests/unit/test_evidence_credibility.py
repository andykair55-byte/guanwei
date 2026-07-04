"""
证据可信度计算单元测试
基于 services/credibility.py 中的实际代码编写
覆盖：get_base_credibility, evaluate_source_credibility, cross_validate_sources, calculate_final_tendency
"""
import pytest
from services.credibility import (
    get_base_credibility,
    evaluate_source_credibility,
    cross_validate_sources,
    calculate_final_tendency,
    SOURCE_PATTERNS,
)


class TestGetBaseCredibility:
    """get_base_credibility 基础可信度测试"""

    def test_gov_cn_is_5_star(self):
        """政府网站（gov.cn）→ 5星"""
        assert get_base_credibility("https://www.gov.cn/news/article") == 5

    def test_xinhua_is_5_star(self):
        """权威媒体（xinhua.net）→ 5星"""
        assert get_base_credibility("https://www.xinhua.net/politics/2024-01/01/c_1123456789.htm") == 5

    def test_people_com_cn_is_5_star(self):
        """权威媒体（people.com.cn）→ 5星"""
        assert get_base_credibility("https://www.people.com.cn/n1/2024/0101/c1234-12345678.html") == 5

    def test_sina_is_4_star(self):
        """正规媒体（sina.com.cn）→ 4星"""
        assert get_base_credibility("https://news.sina.com.cn/c/2024-01-01/doc-abcdefg1234567.shtml") == 4

    def test_163_is_4_star(self):
        """正规媒体（163.com）→ 4星"""
        assert get_base_credibility("https://news.163.com/24/0101/12/ABCDEFG123456789.html") == 4

    def test_weibo_is_3_star(self):
        """自媒体（weibo.com）→ 3星"""
        assert get_base_credibility("https://weibo.com/1234567890/ABCdefGhi") == 3

    def test_douyin_is_3_star(self):
        """自媒体（douyin.com）→ 3星"""
        assert get_base_credibility("https://www.douyin.com/video/1234567890123456789") == 3

    def test_unknown_source_is_2_star(self):
        """未知来源 → 2星（默认）"""
        assert get_base_credibility("https://unknown-website.com/random-news") == 2

    def test_random_blog_is_2_star(self):
        """不知名博客 → 2星"""
        assert get_base_credibility("https://myblog.wordpress.com/some-post") == 2

    def test_url_case_insensitive(self):
        """URL 大小写不敏感"""
        assert get_base_credibility("HTTPS://WWW.GOV.CN/NEWS") == 5
        assert get_base_credibility("https://www.GOV.cn/news") == 5

    def test_subdomain_matches(self):
        """子域名也能匹配（使用包含主域名的URL）"""
        assert get_base_credibility("https://news.sina.com.cn/article") == 4
        assert get_base_credibility("https://m.weibo.com/status/123") == 3

    def test_bilibili_is_3_star(self):
        """B站（bilibili.com）→ 3星"""
        assert get_base_credibility("https://www.bilibili.com/video/BV123456789/") == 3

    def test_cctv_is_5_star(self):
        """央视（cctv.com）→ 5星"""
        assert get_base_credibility("https://news.cctv.com/2024/01/01/ARTIabcdefg123456.shtml") == 5

    def test_arxiv_is_5_star(self):
        """学术（arxiv.org）→ 5星"""
        assert get_base_credibility("https://arxiv.org/abs/2401.01234") == 5


class TestEvaluateSourceCredibility:
    """evaluate_source_credibility 综合评估测试"""

    def test_returns_expected_structure(self):
        """返回结构完整性"""
        result = evaluate_source_credibility(
            url="https://www.gov.cn/news",
            content="这是一条详细的新闻内容，包含了很多信息。",
            title="测试新闻标题",
        )
        assert "credibility" in result
        assert "status" in result
        assert "reason" in result
        assert "factors" in result
        assert "source_type" in result["factors"]
        assert "content_quality" in result["factors"]
        assert "consistency" in result["factors"]

    def test_authoritative_source_long_content_high_credibility(self):
        """权威来源 + 长内容 → 高可信度（verified）"""
        long_content = "据悉，根据调查，这是一篇非常详细的报道内容。" * 20
        result = evaluate_source_credibility(
            url="https://www.gov.cn/news/article",
            content=long_content,
            title="官方发布的重要消息",
        )
        assert result["credibility"] >= 4
        assert result["status"] == "verified"

    def test_unknown_source_short_content_low_credibility(self):
        """未知来源 + 短内容 → 低可信度（unreliable 或 pending）"""
        short_content = "快看！大新闻！"
        result = evaluate_source_credibility(
            url="https://unknown-site.com/fake-news",
            content=short_content,
            title="震惊体标题",
        )
        assert result["credibility"] <= 3
        assert result["status"] in ["unreliable", "pending"]

    def test_credibility_range_1_to_5(self):
        """可信度分数在1-5之间"""
        result = evaluate_source_credibility(
            url="https://example.com/article",
            content="一些内容",
            title="标题",
        )
        assert 1 <= result["credibility"] <= 5

    def test_status_is_valid(self):
        """状态是有效值"""
        result = evaluate_source_credibility(
            url="https://example.com/article",
            content="一些内容",
            title="标题",
        )
        assert result["status"] in ["verified", "pending", "unreliable"]

    def test_with_published_at(self):
        """带发布时间的评估"""
        result = evaluate_source_credibility(
            url="https://www.xinhuanet.com/news",
            content="这是一条详细的新闻报道，包含了丰富的信息。",
            title="新闻标题",
            published_at="2024-01-01T12:00:00",
        )
        assert "credibility" in result
        assert result["factors"]["consistency"] > 0

    def test_medium_source_medium_content(self):
        """中等来源 + 中等内容 → pending"""
        medium_content = "这是一篇普通的新闻报道，有一些细节描述。" * 5
        result = evaluate_source_credibility(
            url="https://weibo.com/user/post",
            content=medium_content,
            title="微博帖子",
        )
        assert result["status"] in ["pending", "unreliable"]

    def test_content_with_reporting_markers(self):
        """内容包含报道性词汇 → 内容质量加分"""
        content_with_markers = "据悉，根据调查，据报道，相关人士透露。" * 10
        result = evaluate_source_credibility(
            url="https://sina.com.cn/news",
            content=content_with_markers,
            title="新闻报道",
        )
        assert result["factors"]["content_quality"] >= 3


class TestCrossValidateSources:
    """cross_validate_sources 交叉验证测试"""

    def test_empty_list(self):
        """空列表处理"""
        result = cross_validate_sources([])
        assert result["consistency_score"] == 0
        assert result["agreement_rate"] == 0

    def test_all_verified_high_consistency(self):
        """全部 verified → 高一致性"""
        sources = [
            {"status": "verified", "credibility": 5},
            {"status": "verified", "credibility": 4},
            {"status": "verified", "credibility": 5},
        ]
        result = cross_validate_sources(sources)
        assert result["consistency_score"] == 5
        assert result["agreement_rate"] == 1.0
        assert result["verified_count"] == 3
        assert result["total_count"] == 3

    def test_all_unverified_low_consistency(self):
        """全部 unverified → 低一致性"""
        sources = [
            {"status": "unreliable", "credibility": 2},
            {"status": "unreliable", "credibility": 1},
            {"status": "pending", "credibility": 3},
        ]
        result = cross_validate_sources(sources)
        assert result["consistency_score"] == 1
        assert result["agreement_rate"] == 0

    def test_mixed_sources_medium_consistency(self):
        """混合情况 → 中等一致性"""
        sources = [
            {"status": "verified", "credibility": 5},
            {"status": "verified", "credibility": 4},
            {"status": "unreliable", "credibility": 2},
            {"status": "pending", "credibility": 3},
            {"status": "verified", "credibility": 4},
        ]
        result = cross_validate_sources(sources)
        assert 2 <= result["consistency_score"] <= 4
        assert 0 < result["agreement_rate"] < 1

    def test_half_verified(self):
        """一半 verified → 中等一致性"""
        sources = [
            {"status": "verified", "credibility": 4},
            {"status": "verified", "credibility": 4},
            {"status": "unreliable", "credibility": 2},
            {"status": "unreliable", "credibility": 2},
        ]
        result = cross_validate_sources(sources)
        assert result["agreement_rate"] == 0.5
        assert result["consistency_score"] == 3

    def test_single_verified(self):
        """单个 verified 来源"""
        sources = [
            {"status": "verified", "credibility": 5},
        ]
        result = cross_validate_sources(sources)
        assert result["consistency_score"] == 5
        assert result["agreement_rate"] == 1.0

    def test_single_unverified(self):
        """单个 unverified 来源"""
        sources = [
            {"status": "unreliable", "credibility": 2},
        ]
        result = cross_validate_sources(sources)
        assert result["consistency_score"] == 1
        assert result["agreement_rate"] == 0


class TestCalculateFinalTendency:
    """calculate_final_tendency 最终倾向性判断测试"""

    def test_empty_list_insufficient_evidence(self):
        """空列表 → 证据不足，无法判断"""
        result = calculate_final_tendency([], "测试声明")
        assert result["tendency"] == "证据不足，无法判断"
        assert result["tendency_direction"] is None
        assert result["confidence"] == 0.0

    def test_high_credibility_high_verified_tends_true(self):
        """高可信度+高验证率 → 倾向于真实"""
        sources = [
            {"credibility": 5, "status": "verified"},
            {"credibility": 5, "status": "verified"},
            {"credibility": 4, "status": "verified"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert result["tendency_direction"] is True
        assert "真实" in result["tendency"]
        assert result["confidence"] > 0.7

    def test_low_credibility_high_unreliable_tends_false(self):
        """低可信度+高不可靠率 → 倾向于不实"""
        sources = [
            {"credibility": 2, "status": "unreliable"},
            {"credibility": 1, "status": "unreliable"},
            {"credibility": 2, "status": "unreliable"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert result["tendency_direction"] is False
        assert "不实" in result["tendency"] or "疑点" in result["tendency"]

    def test_medium_credibility_mixed_maybe_true(self):
        """中等可信度混合 → 可能属实但需更多佐证"""
        sources = [
            {"credibility": 4, "status": "verified"},
            {"credibility": 3, "status": "pending"},
            {"credibility": 3, "status": "pending"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert result["tendency_direction"] is True
        assert "可能" in result["tendency"] or "更多佐证" in result["tendency"]

    def test_low_credibility_mixed_insufficient(self):
        """低可信度混合（平均<3且不可靠率<50%）→ 不足以判断"""
        sources = [
            {"credibility": 2, "status": "pending"},
            {"credibility": 2, "status": "pending"},
            {"credibility": 3, "status": "unreliable"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert result["tendency_direction"] is None
        assert "不足以" in result["tendency"] or "谨慎" in result["tendency"]

    def test_confidence_range(self):
        """置信度在0-1之间"""
        sources = [
            {"credibility": 4, "status": "verified"},
            {"credibility": 3, "status": "pending"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert 0 <= result["confidence"] <= 1

    def test_returns_expected_structure(self):
        """返回结构完整性"""
        sources = [
            {"credibility": 4, "status": "verified"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert "tendency" in result
        assert "tendency_direction" in result
        assert "confidence" in result

    def test_single_high_credibility_verified(self):
        """单个高可信度已验证来源"""
        sources = [
            {"credibility": 5, "status": "verified"},
        ]
        result = calculate_final_tendency(sources, "测试声明")
        assert result["tendency_direction"] is True


class TestSourcePatterns:
    """SOURCE_PATTERNS 配置测试"""

    def test_has_gov_sources(self):
        """包含政府来源"""
        assert "gov.cn" in SOURCE_PATTERNS
        assert SOURCE_PATTERNS["gov.cn"] == 5

    def test_has_authoritative_media(self):
        """包含权威媒体"""
        assert "xinhua.net" in SOURCE_PATTERNS
        assert "people.com.cn" in SOURCE_PATTERNS
        assert SOURCE_PATTERNS["xinhua.net"] == 5

    def test_has_regular_media(self):
        """包含正规媒体"""
        assert "sina.com.cn" in SOURCE_PATTERNS
        assert "163.com" in SOURCE_PATTERNS
        assert SOURCE_PATTERNS["sina.com.cn"] == 4

    def test_has_self_media(self):
        """包含自媒体"""
        assert "weibo.com" in SOURCE_PATTERNS
        assert "douyin.com" in SOURCE_PATTERNS
        assert SOURCE_PATTERNS["weibo.com"] == 3

    def test_all_levels_are_1_to_5(self):
        """所有可信度等级都在1-5之间"""
        for pattern, level in SOURCE_PATTERNS.items():
            assert 1 <= level <= 5, f"{pattern} 的可信度 {level} 不在 1-5 范围内"
