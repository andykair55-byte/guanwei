"""
段位计算单元测试
"""
import pytest
from ranks import RankCalculator, RANKS


class TestRankCalculator:
    """段位计算测试"""

    def test_initial_rank(self):
        """测试初始段位"""
        rank = RankCalculator.calculate_rank(0, 0, 0)
        assert rank == "吃瓜群众"

    def test_rank_level_1(self):
        """测试 Lv.1 段位"""
        rank = RankCalculator.calculate_rank(
            correct_guesses=10,
            accuracy_rate=0.35,
            total_guesses=30
        )
        assert rank == "瓜田新手"

    def test_rank_level_2(self):
        """测试 Lv.2 段位"""
        rank = RankCalculator.calculate_rank(
            correct_guesses=30,
            accuracy_rate=0.40,
            total_guesses=80
        )
        assert rank == "鉴瓜学徒"

    def test_rank_level_3(self):
        """测试 Lv.3 段位"""
        rank = RankCalculator.calculate_rank(
            correct_guesses=80,
            accuracy_rate=0.50,
            total_guesses=180
        )
        assert rank == "瓜田侦探"

    def test_rank_level_4(self):
        """测试 Lv.4 段位"""
        rank = RankCalculator.calculate_rank(
            correct_guesses=200,
            accuracy_rate=0.55,
            total_guesses=400
        )
        assert rank == "鉴瓜达人"

    def test_rank_level_5(self):
        """测试 Lv.5 段位"""
        rank = RankCalculator.calculate_rank(
            correct_guesses=400,
            accuracy_rate=0.60,
            total_guesses=800
        )
        assert rank == "鉴瓜大师"

    def test_rank_level_6(self):
        """测试 Lv.6 段位（最高）"""
        rank = RankCalculator.calculate_rank(
            correct_guesses=800,
            accuracy_rate=0.65,
            total_guesses=1500
        )
        assert rank == "见微先知"

    def test_accuracy_rate_calculation(self):
        """测试准确率计算"""
        rate = RankCalculator.calculate_accuracy_rate(10, 30)
        assert rate == 0.333

    def test_progress_calculation(self):
        """测试段位进度计算"""
        progress = RankCalculator.calculate_progress(
            current_rank="瓜田新手",
            correct_guesses=20,
            accuracy_rate=0.40,
            total_guesses=50
        )
        assert progress["current_level"] == 1
        assert progress["next_rank"] == "鉴瓜学徒"
        assert "progress_percent" in progress

    def test_rank_requirements(self):
        """测试段位配置完整性"""
        assert len(RANKS) == 7
        for rank in RANKS:
            assert "level" in rank
            assert "name" in rank
            assert "min_correct" in rank
            assert "min_accuracy" in rank
            assert "min_total" in rank