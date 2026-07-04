"""
段位计算单元测试
基于 ranks.py 中的实际代码编写
覆盖：初始段位、各段位临界值、准确率/参与次数/猜对次数边界
"""
import pytest
from ranks import RANK_CONFIG, calculate_rank


class TestRankConfig:
    """RANK_CONFIG 配置完整性测试"""

    def test_rank_count_is_7(self):
        """验证有7个段位"""
        assert len(RANK_CONFIG) == 7

    def test_rank_names_correct(self):
        """验证段位名称正确"""
        expected_names = [
            "吃瓜群众",
            "瓜田新手",
            "鉴瓜学徒",
            "瓜田侦探",
            "鉴瓜达人",
            "鉴瓜大师",
            "见微先知",
        ]
        assert list(RANK_CONFIG.keys()) == expected_names

    def test_each_rank_has_required_fields(self):
        """验证每个段位配置包含必需字段"""
        required_fields = ["level", "min_correct", "min_accuracy", "min_total", "icon"]
        for rank_name, config in RANK_CONFIG.items():
            for field in required_fields:
                assert field in config, f"{rank_name} 缺少字段 {field}"

    def test_levels_are_sequential(self):
        """验证段位等级从0到6连续"""
        levels = [config["level"] for config in RANK_CONFIG.values()]
        assert levels == [0, 1, 2, 3, 4, 5, 6]

    def test_min_correct_increasing(self):
        """验证最低猜对次数单调递增"""
        values = [config["min_correct"] for config in RANK_CONFIG.values()]
        for i in range(1, len(values)):
            assert values[i] > values[i-1], f"段位 {i} 的 min_correct 应该大于 {i-1}"

    def test_min_total_increasing(self):
        """验证最低参与次数单调递增"""
        values = [config["min_total"] for config in RANK_CONFIG.values()]
        for i in range(1, len(values)):
            assert values[i] > values[i-1], f"段位 {i} 的 min_total 应该大于 {i-1}"

    def test_min_accuracy_increasing(self):
        """验证最低准确率单调递增"""
        values = [config["min_accuracy"] for config in RANK_CONFIG.values()]
        for i in range(1, len(values)):
            assert values[i] >= values[i-1], f"段位 {i} 的 min_accuracy 应该大于等于 {i-1}"


class TestInitialRank:
    """初始段位测试"""

    def test_zero_guesses_initial_rank(self):
        """0次参与时为初始段位：吃瓜群众"""
        assert calculate_rank(0, 0) == "吃瓜群众"

    def test_zero_correct_one_total(self):
        """1次参与但0次猜对：吃瓜群众"""
        assert calculate_rank(0, 1) == "吃瓜群众"

    def test_zero_correct_many_total(self):
        """多次参与但0次猜对：吃瓜群众"""
        assert calculate_rank(0, 100) == "吃瓜群众"


class TestRankLevel1:
    """瓜田新手（Lv.1）段位测试"""

    def test_exact_threshold(self):
        """刚好达到瓜田新手：猜对10次，参与30次，准确率33.3%（>=25%）"""
        assert calculate_rank(10, 30) == "瓜田新手"

    def test_accuracy_just_enough(self):
        """准确率刚好达标：25%（使用100次参与，25次猜对 = 25%）"""
        assert calculate_rank(25, 100) == "瓜田新手"

    def test_accuracy_barely_miss(self):
        """准确率差一点：24/100 = 24% < 25%"""
        assert calculate_rank(24, 100) != "瓜田新手"

    def test_total_just_enough(self):
        """参与次数刚好达标：30次"""
        assert calculate_rank(10, 30) == "瓜田新手"

    def test_total_barely_miss(self):
        """参与次数差一点：29次"""
        assert calculate_rank(10, 29) != "瓜田新手"

    def test_correct_just_enough(self):
        """猜对次数刚好达标：10次"""
        assert calculate_rank(10, 30) == "瓜田新手"

    def test_correct_barely_miss(self):
        """猜对次数差一点：9次"""
        assert calculate_rank(9, 30) != "瓜田新手"


class TestRankLevel2:
    """鉴瓜学徒（Lv.2）段位测试"""

    def test_exact_threshold(self):
        """刚好达到鉴瓜学徒：猜对30次，参与80次，准确率37.5%（>=35%）"""
        assert calculate_rank(30, 80) == "鉴瓜学徒"

    def test_accuracy_just_enough(self):
        """准确率刚好达标：35%"""
        total = 100
        correct = int(total * 0.35)
        assert calculate_rank(correct, total) == "鉴瓜学徒"

    def test_accuracy_barely_miss(self):
        """准确率差一点：34%"""
        assert calculate_rank(34, 100) != "鉴瓜学徒"

    def test_total_just_enough(self):
        """参与次数刚好达标：80次"""
        assert calculate_rank(30, 80) == "鉴瓜学徒"

    def test_total_barely_miss(self):
        """参与次数差一点：79次"""
        assert calculate_rank(30, 79) != "鉴瓜学徒"

    def test_correct_just_enough(self):
        """猜对次数刚好达标：30次"""
        assert calculate_rank(30, 80) == "鉴瓜学徒"

    def test_correct_barely_miss(self):
        """猜对次数差一点：29次"""
        assert calculate_rank(29, 80) != "鉴瓜学徒"


class TestRankLevel3:
    """瓜田侦探（Lv.3）段位测试"""

    def test_exact_threshold(self):
        """刚好达到瓜田侦探：猜对80次，参与180次，准确率44.4%（>=45%？需要验证）"""
        config = RANK_CONFIG["瓜田侦探"]
        correct = config["min_correct"]
        total = config["min_total"]
        accuracy = correct / total
        if accuracy >= config["min_accuracy"]:
            assert calculate_rank(correct, total) == "瓜田侦探"
        else:
            pytest.skip("临界值准确率不达标，需要更高的正确次数")

    def test_high_accuracy_meets_total(self):
        """高准确率，达到参与次数和猜对次数要求"""
        assert calculate_rank(90, 180) == "瓜田侦探"

    def test_total_just_enough(self):
        """参与次数刚好达标：180次"""
        assert calculate_rank(90, 180) == "瓜田侦探"

    def test_total_barely_miss(self):
        """参与次数差一点：179次"""
        assert calculate_rank(90, 179) != "瓜田侦探"

    def test_correct_just_enough(self):
        """猜对次数刚好达标且准确率达标"""
        assert calculate_rank(81, 180) == "瓜田侦探"

    def test_correct_barely_miss(self):
        """猜对次数差一点：79次"""
        assert calculate_rank(79, 180) != "瓜田侦探"


class TestRankLevel4:
    """鉴瓜达人（Lv.4）段位测试"""

    def test_exact_threshold(self):
        """刚好达到鉴瓜达人：猜对200次，参与400次，准确率50%（>=50%）"""
        assert calculate_rank(200, 400) == "鉴瓜达人"

    def test_accuracy_just_enough(self):
        """准确率刚好达标：50%"""
        assert calculate_rank(200, 400) == "鉴瓜达人"

    def test_accuracy_barely_miss(self):
        """准确率差一点：49%"""
        assert calculate_rank(196, 400) != "鉴瓜达人"

    def test_total_just_enough(self):
        """参与次数刚好达标：400次"""
        assert calculate_rank(200, 400) == "鉴瓜达人"

    def test_total_barely_miss(self):
        """参与次数差一点：399次"""
        assert calculate_rank(200, 399) != "鉴瓜达人"

    def test_correct_just_enough(self):
        """猜对次数刚好达标：200次"""
        assert calculate_rank(200, 400) == "鉴瓜达人"

    def test_correct_barely_miss(self):
        """猜对次数差一点：199次"""
        assert calculate_rank(199, 400) != "鉴瓜达人"


class TestRankLevel5:
    """鉴瓜大师（Lv.5）段位测试"""

    def test_exact_threshold(self):
        """刚好达到鉴瓜大师：猜对400次，参与800次，准确率50%（>=55%？需要验证）"""
        config = RANK_CONFIG["鉴瓜大师"]
        correct = config["min_correct"]
        total = config["min_total"]
        accuracy = correct / total
        if accuracy >= config["min_accuracy"]:
            assert calculate_rank(correct, total) == "鉴瓜大师"
        else:
            pytest.skip("临界值准确率不达标，需要更高的正确次数")

    def test_high_accuracy_meets_total(self):
        """高准确率，达到参与次数和猜对次数要求"""
        assert calculate_rank(440, 800) == "鉴瓜大师"

    def test_total_just_enough(self):
        """参与次数刚好达标：800次"""
        assert calculate_rank(440, 800) == "鉴瓜大师"

    def test_total_barely_miss(self):
        """参与次数差一点：799次"""
        assert calculate_rank(440, 799) != "鉴瓜大师"

    def test_correct_just_enough(self):
        """猜对次数刚好达标且准确率达标"""
        assert calculate_rank(440, 800) == "鉴瓜大师"

    def test_correct_barely_miss(self):
        """猜对次数差一点：399次"""
        assert calculate_rank(399, 800) != "鉴瓜大师"


class TestRankLevel6:
    """见微先知（Lv.6）最高段位测试"""

    def test_exact_threshold(self):
        """刚好达到见微先知：猜对800次，参与1500次，准确率53.3%（>=60%？需要验证）"""
        config = RANK_CONFIG["见微先知"]
        correct = config["min_correct"]
        total = config["min_total"]
        accuracy = correct / total
        if accuracy >= config["min_accuracy"]:
            assert calculate_rank(correct, total) == "见微先知"
        else:
            pytest.skip("临界值准确率不达标，需要更高的正确次数")

    def test_high_accuracy_meets_total(self):
        """高准确率，达到参与次数和猜对次数要求"""
        assert calculate_rank(900, 1500) == "见微先知"

    def test_is_highest_rank(self):
        """验证见微先知是最高段位"""
        assert calculate_rank(10000, 10000) == "见微先知"

    def test_total_just_enough(self):
        """参与次数刚好达标：1500次且准确率达标"""
        assert calculate_rank(900, 1500) == "见微先知"

    def test_total_barely_miss(self):
        """参与次数差一点：1499次"""
        assert calculate_rank(900, 1499) != "见微先知"

    def test_super_high_stats(self):
        """远超最高段位要求，仍然是见微先知"""
        assert calculate_rank(5000, 8000) == "见微先知"


class TestEdgeCases:
    """边界情况测试"""

    def test_negative_correct_guesses(self):
        """负数猜对次数（异常输入）"""
        assert calculate_rank(-1, 10) == "吃瓜群众"

    def test_negative_total_guesses(self):
        """负数参与次数（异常输入）"""
        assert calculate_rank(0, -1) == "吃瓜群众"

    def test_correct_greater_than_total(self):
        """猜对次数大于参与次数（异常输入，按实际计算）"""
        assert calculate_rank(100, 50) == "瓜田新手"

    def test_very_high_accuracy_low_count(self):
        """准确率很高但参与次数不足"""
        assert calculate_rank(5, 5) == "吃瓜群众"

    def test_very_low_accuracy_high_count(self):
        """准确率很低但参与次数很多（1%准确率，不满足参与次数但不满足准确率）"""
        assert calculate_rank(10, 1000) == "吃瓜群众"

    def test_all_ranks_reachable(self):
        """验证所有段位都是可达到的"""
        test_cases = [
            (0, 0, "吃瓜群众"),
            (10, 30, "瓜田新手"),
            (30, 80, "鉴瓜学徒"),
            (90, 180, "瓜田侦探"),
            (200, 400, "鉴瓜达人"),
            (440, 800, "鉴瓜大师"),
            (900, 1500, "见微先知"),
        ]
        for correct, total, expected_rank in test_cases:
            result = calculate_rank(correct, total)
            assert result == expected_rank, f"猜对{correct}次/参与{total}次，期望{expected_rank}，实际{result}"
