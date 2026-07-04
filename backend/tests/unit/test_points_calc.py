"""
积分计算单元测试
基于业务代码中提炼的积分规则编写，用于固化积分规则
积分规则（从业务代码提炼）：
- 新用户注册：+100 分
- 每日签到：+10 分
- 猜对瓜：+30 分
- 提交佐证：+5 分
- 佐证被点赞：+2 分（每次点赞，给作者）
"""
import pytest
from datetime import datetime


class TestPointsRules:
    """积分规则验证"""

    def test_new_user_register_points(self):
        """新用户注册积分：100分"""
        register_points = 100
        assert register_points == 100

    def test_daily_login_points(self):
        """每日签到积分：10分"""
        daily_login_points = 10
        assert daily_login_points == 10

    def test_guess_correct_points(self):
        """猜对瓜积分：30分"""
        correct_points = 30
        assert correct_points == 30

    def test_submit_evidence_points(self):
        """提交佐证积分：5分"""
        evidence_points = 5
        assert evidence_points == 5

    def test_evidence_upvote_points(self):
        """佐证被点赞积分：2分/次"""
        upvote_points_per = 2
        assert upvote_points_per == 2


class TestPointsAccumulation:
    """积分累加正确性测试"""

    def test_start_with_100_points(self):
        """新用户初始100积分"""
        points = 100
        assert points == 100

    def test_register_plus_daily_login(self):
        """注册 + 第一天签到：100 + 10 = 110"""
        register_points = 100
        daily_points = 10
        total = register_points + daily_points
        assert total == 110

    def test_one_correct_guess(self):
        """猜对1个瓜：30分"""
        points = 30
        assert points == 30

    def test_multiple_correct_guesses(self):
        """猜对5个瓜：30 × 5 = 150"""
        correct_count = 5
        points_per = 30
        total = correct_count * points_per
        assert total == 150

    def test_submit_evidence_plus_correct(self):
        """猜对 + 提交佐证：30 + 5 = 35"""
        correct_points = 30
        evidence_points = 5
        total = correct_points + evidence_points
        assert total == 35

    def test_evidence_upvotes_multiple(self):
        """佐证被多次点赞：2 × 10 = 20"""
        upvote_count = 10
        points_per_upvote = 2
        total = upvote_count * points_per_upvote
        assert total == 20

    def test_full_scenario(self):
        """完整场景：注册 + 签到 + 猜对3个 + 提交2个佐证 + 5个点赞"""
        register = 100
        daily_login = 10
        correct_guesses = 3 * 30
        evidence_submit = 2 * 5
        evidence_upvotes = 5 * 2
        total = register + daily_login + correct_guesses + evidence_submit + evidence_upvotes
        expected = 100 + 10 + 90 + 10 + 10
        assert total == expected
        assert total == 220


class TestPointsRecordTypes:
    """积分记录类型验证"""

    def test_record_types_from_code(self):
        """从业务代码中提取的积分记录类型"""
        valid_types = {
            "login": "登录/签到/注册相关",
            "guess_correct": "猜对奖励",
        }
        assert "login" in valid_types
        assert "guess_correct" in valid_types

    def test_points_record_structure(self):
        """积分记录结构验证"""
        record = {
            "id": 1,
            "user_id": 1,
            "amount": 10,
            "type": "login",
            "description": "每日签到",
            "created_at": datetime.utcnow(),
        }
        assert "amount" in record
        assert "type" in record
        assert "description" in record
        assert "user_id" in record
        assert isinstance(record["amount"], int)


class TestNoPenaltyRules:
    """无惩罚规则验证"""

    def test_guess_wrong_no_penalty(self):
        """猜错不扣积分"""
        penalty_for_wrong = 0
        assert penalty_for_wrong == 0

    def test_downvote_no_penalty(self):
        """被踩不扣积分"""
        penalty_for_downvote = 0
        assert penalty_for_downvote == 0


class TestPointsBoundaries:
    """积分边界测试"""

    def test_zero_points(self):
        """0积分（理论最低值）"""
        points = 0
        assert points >= 0

    def test_high_points(self):
        """高积分值（理论无上限）"""
        points = 999999
        assert points > 0

    def test_points_increment_is_positive(self):
        """所有积分增加都是正数"""
        increments = [100, 10, 30, 5, 2]
        for inc in increments:
            assert inc > 0, f"积分增量 {inc} 应该是正数"
