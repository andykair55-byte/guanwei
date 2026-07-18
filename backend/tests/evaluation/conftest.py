# backend/tests/evaluation/conftest.py
"""evaluation 测试目录的 pytest 配置

⚠️ pytest_addoption / pytest_configure 必须放在 conftest.py 中才会被 pytest 自动注册，
放在普通测试文件中无效（plan Task 21 原稿写在 test_workspace_eval.py 中，需修正）。
"""
import os
import pytest


# 评测结果存储目录
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")


def pytest_addoption(parser):
    """添加 --run-eval 命令行选项"""
    parser.addoption(
        "--run-eval",
        action="store_true",
        default=False,
        help="运行工作间评测（消耗 token）",
    )
    parser.addoption(
        "--case-id",
        default=None,
        help="只运行指定 case_id",
    )


def pytest_configure(config):
    if not os.path.exists(RESULTS_DIR):
        os.makedirs(RESULTS_DIR)
