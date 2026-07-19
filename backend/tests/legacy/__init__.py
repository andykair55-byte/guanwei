"""legacy 测试目录

spec-14 任务 4 修复：
- test_ranks.py 中的 RankCalculator 类已从 ranks.py 移除，
  替代实现 calculate_rank() 函数由 tests/unit/test_rank_calc.py 覆盖。
- test_ranks.py 已移至 _deprecated/ 子目录，不参与 pytest 收集。
"""
