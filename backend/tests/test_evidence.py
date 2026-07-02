"""
证据链服务单元测试
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from services.evidence import EvidenceService, SOURCE_CREDIBILITY_BASE


class TestEvidenceService:
    """证据链服务测试"""

    @pytest.fixture
    def mock_db(self):
        """模拟数据库会话"""
        return MagicMock()

    @pytest.fixture
    def service(self, mock_db):
        """创建服务实例"""
        return EvidenceService(mock_db)

    def test_source_credibility_base(self):
        """测试来源可信度基准"""
        assert SOURCE_CREDIBILITY_BASE["official"] == 5
        assert SOURCE_CREDIBILITY_BASE["media"] == 4
        assert SOURCE_CREDIBILITY_BASE["social"] == 2
        assert SOURCE_CREDIBILITY_BASE["forum"] == 1

    def test_calculate_credibility_score_recent(self, service):
        """测试近期证据可信度评分"""
        evidence = MagicMock()
        evidence.credibility_level = 5
        evidence.relevance_score = 0.8
        evidence.timestamp = datetime.utcnow() - timedelta(days=3)

        score = service.calculate_credibility_score(evidence)
        # 5 * 0.8 * 1.0 = 4.0
        assert score == 4.0

    def test_calculate_credibility_score_week_old(self, service):
        """测试一周前的证据评分"""
        evidence = MagicMock()
        evidence.credibility_level = 5
        evidence.relevance_score = 0.8
        evidence.timestamp = datetime.utcnow() - timedelta(days=10)

        score = service.calculate_credibility_score(evidence)
        # 5 * 0.8 * 0.8 = 3.2
        assert score == 3.2

    def test_calculate_credibility_score_month_old(self, service):
        """测试一个月前的证据评分"""
        evidence = MagicMock()
        evidence.credibility_level = 5
        evidence.relevance_score = 0.8
        evidence.timestamp = datetime.utcnow() - timedelta(days=35)

        score = service.calculate_credibility_score(evidence)
        # 5 * 0.8 * 0.5 = 2.0
        assert score == 2.0

    def test_sort_by_credibility(self, service):
        """测试可信度排序"""
        evidences = [
            MagicMock(credibility_level=3, relevance_score=0.5, timestamp=datetime.utcnow()),
            MagicMock(credibility_level=5, relevance_score=0.8, timestamp=datetime.utcnow()),
            MagicMock(credibility_level=4, relevance_score=0.6, timestamp=datetime.utcnow()),
        ]

        sorted_evidences = service.sort_by_credibility(evidences)
        # 最高可信度应该排在第一位
        assert sorted_evidences[0].credibility_level == 5

    def test_to_dict(self, service):
        """测试字典转换"""
        evidence = MagicMock()
        evidence.id = 1
        evidence.source_url = "https://example.com"
        evidence.source_type = "official"
        evidence.credibility_level = 5
        evidence.relevance_score = 0.8
        evidence.content_summary = "测试证据"
        evidence.timestamp = datetime.utcnow()
        evidence.created_at = datetime.utcnow()

        result = service.to_dict(evidence)
        assert result["id"] == 1
        assert result["source_url"] == "https://example.com"
        assert result["source_type"] == "official"
        assert "credibility_score" in result