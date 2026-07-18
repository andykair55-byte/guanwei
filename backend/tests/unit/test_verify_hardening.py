# backend/tests/unit/test_verify_hardening.py
"""verify pipeline 生产加固单测（spec: 2026-07-18-verify-pipeline-hardening）"""
import pytest
from datetime import datetime, timedelta
from models import PipelineRun


def test_verify_returns_409_for_duplicate_content(client, db_session):
    """相同 content 在 5 分钟内重复提交 → 409 + existing_pipeline_id"""
    # 第一次提交
    resp1 = client.post("/api/v1/verify", json={"content": "测试重复提交的内容"})
    assert resp1.status_code == 200
    pipeline_id_1 = resp1.json()["pipeline_id"]

    # 第二次提交相同 content
    resp2 = client.post("/api/v1/verify", json={"content": "测试重复提交的内容"})
    assert resp2.status_code == 409
    detail = resp2.json()["detail"]
    assert detail["error"] == "DUPLICATE_SUBMIT"
    assert detail["existing_pipeline_id"] == pipeline_id_1


def test_verify_allows_different_content(client, db_session):
    """不同 content 正常提交，不触发 409"""
    resp1 = client.post("/api/v1/verify", json={"content": "内容 A"})
    resp2 = client.post("/api/v1/verify", json={"content": "内容 B"})
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["pipeline_id"] != resp2.json()["pipeline_id"]


def test_verify_allows_after_previous_completed(client, db_session):
    """前一个任务已终态（success/failed），相同 content 可再次提交"""
    # 第一次提交
    resp1 = client.post("/api/v1/verify", json={"content": "已完成的内容"})
    pipeline_id_1 = resp1.json()["pipeline_id"]

    # 手动把第一个标成 success
    run = db_session.query(PipelineRun).filter_by(pipeline_id=pipeline_id_1).first()
    run.status = "success"
    db_session.commit()

    # 相同 content 再次提交
    resp2 = client.post("/api/v1/verify", json={"content": "已完成的内容"})
    assert resp2.status_code == 200
    assert resp2.json()["pipeline_id"] != pipeline_id_1


import asyncio
from unittest.mock import patch, AsyncMock


def test_verify_returns_429_when_semaphore_exhausted(client, db_session):
    """Semaphore 耗尽时返回 429 + retry_after_seconds"""
    # 模拟 Semaphore 已满（_value=0）
    from api import routes as routes_module
    with patch.object(routes_module._verify_semaphore, "_value", 0):
        with patch.object(routes_module._verify_semaphore, "locked", return_value=True):
            resp = client.post("/api/v1/verify", json={"content": "限流测试"})
            assert resp.status_code == 429
            detail = resp.json()["detail"]
            assert detail["error"] == "RATE_LIMITED"
            assert "retry_after_seconds" in detail


def test_verify_semaphore_releases_after_completion(client, db_session):
    """正常完成后 Semaphore 释放"""
    from api import routes as routes_module
    initial_value = routes_module._verify_semaphore._value

    resp = client.post("/api/v1/verify", json={"content": "正常请求"})
    assert resp.status_code == 200

    # Semaphore 应该恢复初始值（因为是同步测试，请求已完成）
    assert routes_module._verify_semaphore._value == initial_value


def test_get_pipeline_reaper_marks_zombie_as_failed(client, db_session):
    """running 超过 5 分钟无更新 → GET 时标 failed"""
    # 造一个 6 分钟前的 running 任务
    run = PipelineRun(
        pipeline_id="zombie-test-id",
        input_content="僵尸测试",
        status="running",
        created_at=datetime.utcnow() - timedelta(minutes=6),
        updated_at=datetime.utcnow() - timedelta(minutes=6),
    )
    db_session.add(run)
    db_session.commit()

    # GET 触发 reaper
    resp = client.get("/api/v1/pipeline/zombie-test-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "failed"
    assert "超时" in resp.json().get("error_message", "") or "reaper" in resp.json().get("error_message", "")


def test_get_pipeline_reaper_skips_recent_running(client, db_session):
    """刚更新的 running 不被 reaper 标记"""
    run = PipelineRun(
        pipeline_id="fresh-test-id",
        input_content="新鲜测试",
        status="running",
        created_at=datetime.utcnow() - timedelta(seconds=30),
        updated_at=datetime.utcnow() - timedelta(seconds=30),
    )
    db_session.add(run)
    db_session.commit()

    resp = client.get("/api/v1/pipeline/fresh-test-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"


def test_get_pipeline_reaper_skips_non_running(client, db_session):
    """非 running 状态不触发 reaper"""
    run = PipelineRun(
        pipeline_id="success-test-id",
        input_content="成功测试",
        status="success",
        created_at=datetime.utcnow() - timedelta(minutes=10),
        updated_at=datetime.utcnow() - timedelta(minutes=10),
    )
    db_session.add(run)
    db_session.commit()

    resp = client.get("/api/v1/pipeline/success-test-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
