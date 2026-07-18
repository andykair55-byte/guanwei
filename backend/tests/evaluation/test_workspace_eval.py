# backend/tests/evaluation/test_workspace_eval.py
"""工作间回归评测 — 端到端质量验证

运行方式：
- 完整评测：pytest tests/evaluation/test_workspace_eval.py -v --run-eval
- 单主题评测：pytest tests/evaluation/test_workspace_eval.py -v --run-eval --case-id=tech-01

注意：
- 本测试会真实调用 LLM，消耗 token
- 默认不运行（需要 --run-eval 标志）
- 评测结果存入 backend/tests/evaluation/results/ 目录，便于历史对比
"""
import pytest
import asyncio
import json
import os
from datetime import datetime

from tests.evaluation.workspace_eval_cases import get_eval_cases, get_eval_case
from tests.evaluation.llm_judge import judge_workspace_output


# 评测结果存储目录
# 注意：pytest_addoption / pytest_configure 已移至 conftest.py（pytest 规范要求）
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")


def _should_run_eval(config) -> bool:
    return config.getoption("--run-eval")


def _get_cases_to_run(config) -> list[dict]:
    case_id = config.getoption("--case-id")
    if case_id:
        case = get_eval_case(case_id)
        return [case] if case else []
    return get_eval_cases()


@pytest.mark.asyncio
async def test_workspace_evaluation(request):
    """工作间端到端评测"""
    if not _should_run_eval(request.config):
        pytest.skip("需要 --run-eval 标志才运行评测")

    cases = _get_cases_to_run(request.config)
    if not cases:
        pytest.skip("没有匹配的评测主题")

    # 延迟导入避免循环依赖
    from services.workspace.engine import workspace_engine

    results = []
    for case in cases:
        # 触发工作间 run
        result = await workspace_engine.run(
            workspace_id=f"eval-{case['id']}-{int(datetime.utcnow().timestamp())}",
            topic=case["topic"],
            platform_order=case["platforms"],
            strategy="dag",
            custom_dag=None,
        )

        # LLM-as-Judge 评分
        platform_contents = result.get("platform_contents", {})
        judge_result = await judge_workspace_output(
            topic=case["topic"],
            golden_points=case["golden_points"],
            platform_contents=platform_contents,
        )

        results.append({
            "case_id": case["id"],
            "topic": case["topic"],
            "category": case["category"],
            "workspace_status": "success" if result.get("success") else "failed",
            "judge_score": judge_result["score"],
            "covered_points": judge_result["covered_points"],
            "missing_points": judge_result["missing_points"],
            "duration_ms": result.get("duration_ms", 0),
            "timestamp": datetime.utcnow().isoformat(),
        })

    # 保存评测结果
    result_file = os.path.join(RESULTS_DIR, f"eval-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json")
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 对比上次评测结果（如果存在）
    _compare_with_last_result(results)

    # 断言：平均分 >= 6（可调整阈值）
    avg_score = sum(r["judge_score"] for r in results) / len(results)
    print(f"\n评测完成：{len(results)} 个主题，平均分 {avg_score:.1f}/10")
    print(f"结果已保存到：{result_file}")

    assert avg_score >= 6.0, f"平均分 {avg_score:.1f} 低于阈值 6.0"


def _compare_with_last_result(current_results: list[dict]):
    """对比上次评测结果，分数下降 >2 分的 case 告警"""
    result_files = sorted(
        [f for f in os.listdir(RESULTS_DIR) if f.startswith("eval-") and f.endswith(".json")],
        reverse=True,
    )
    if len(result_files) < 2:
        return  # 没有历史结果

    last_file = os.path.join(RESULTS_DIR, result_files[1])
    with open(last_file, "r", encoding="utf-8") as f:
        last_results = {r["case_id"]: r for r in json.load(f)}

    print("\n=== 分数对比（vs 上次）===")
    for current in current_results:
        case_id = current["case_id"]
        if case_id in last_results:
            last_score = last_results[case_id]["judge_score"]
            current_score = current["judge_score"]
            diff = current_score - last_score
            marker = "⚠️" if diff < -2 else "✓"
            print(f"{marker} {case_id}: {last_score} → {current_score} ({'+' if diff >= 0 else ''}{diff})")
