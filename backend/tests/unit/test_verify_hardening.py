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
