"""已弃用的测试文件 — 不参与 pytest 收集

spec-14 任务 4：RankCalculator 类已从 ranks.py 中移除，
替代实现是 calculate_rank() 函数，已由 tests/unit/test_rank_calc.py 覆盖。
此目录中的测试保留作为历史归档，不参与测试收集。
"""
collect_ignore = ["test_ranks.py"]
