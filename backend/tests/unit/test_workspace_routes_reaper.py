# backend/tests/unit/test_workspace_routes_reaper.py
"""工作间 routes 防重入 + 僵尸状态懒检查单测（评审 #2）"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


def _make_ws(db_session, status="draft", updated_at=None):
    """构造一个 workspace 记录"""
    from models import Workspace
    import uuid
    ws = Workspace(
        workspace_id=str(uuid.uuid4()),
        topic="测试主题",
        title="测试",
        strategy="dag",
        status=status,
        platform_order='["guanwei"]',
        updated_at=updated_at or datetime.utcnow(),
    )
    db_session.add(ws)
    db_session.commit()
    db_session.refresh(ws)
    return ws


def test_run_workspace_returns_409_when_already_running(client, db_session):
    """评审 #2：running 状态的 workspace 触发 run → 409 + 结构化 detail"""
    with patch("api.workspace_routes.get_db", return_value=db_session):
        ws = _make_ws(db_session, status="running")
        resp = client.post(f"/api/v1/workspaces/{ws.workspace_id}/run", json={"strategy": "dag"})
    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert detail["error"] == "already_running"
    assert detail["workspace_id"] == ws.workspace_id
    assert detail["started_at"]  # ISO 时间字符串


def test_run_workspace_clears_error_message_on_new_run(client, db_session):
    """新 run 开始时 error_message 应被清空，避免显示陈旧错误"""
    with patch("api.workspace_routes.get_db", return_value=db_session):
        ws = _make_ws(db_session, status="failed")
        ws.error_message = "上次失败原因"
        db_session.commit()

        with patch("services.workspace.engine.workspace_engine.run", AsyncMock()):
            with patch("api.workspace_routes._run_workspace_background", AsyncMock()):
                resp = client.post(f"/api/v1/workspaces/{ws.workspace_id}/run", json={"strategy": "dag"})
        assert resp.status_code == 200
        db_session.refresh(ws)
        assert ws.error_message == ""
        assert ws.status == "running"


def test_get_workspace_reaper_marks_zombie_as_failed(client, db_session):
    """评审 #2：running 超过 5 分钟且无新事件 → 标 failed"""
    stale_time = datetime.utcnow() - timedelta(seconds=400)
    with patch("api.workspace_routes.get_db", return_value=db_session):
        ws = _make_ws(db_session, status="running", updated_at=stale_time)
        # 模拟无事件（last_event_age_seconds 返回 inf）
        with patch("api.workspace_routes.event_bus.last_event_age_seconds", return_value=float('inf')):
            with patch("api.workspace_routes.event_bus.emit", new_callable=AsyncMock):
                resp = client.get(f"/api/v1/workspaces/{ws.workspace_id}")
        assert resp.status_code == 200
        db_session.refresh(ws)
        assert ws.status == "failed"
        assert "运行超时" in ws.error_message


def test_get_workspace_reaper_skips_when_recent_event(client, db_session):
    """评审 #2：虽然 running 时间长，但有最近事件 → 不标记失败"""
    stale_time = datetime.utcnow() - timedelta(seconds=400)
    with patch("api.workspace_routes.get_db", return_value=db_session):
        ws = _make_ws(db_session, status="running", updated_at=stale_time)
        # 模拟 30 秒前刚有事件
        with patch("api.workspace_routes.event_bus.last_event_age_seconds", return_value=30.0):
            with patch("api.workspace_routes.event_bus.emit", new_callable=AsyncMock) as mock_emit:
                resp = client.get(f"/api/v1/workspaces/{ws.workspace_id}")
        assert resp.status_code == 200
        db_session.refresh(ws)
        assert ws.status == "running"  # 未被 reaper 标记
        mock_emit.assert_not_called()


def test_get_workspace_reaper_skips_non_running(client, db_session):
    """评审 #2：非 running 状态不触发 reaper"""
    with patch("api.workspace_routes.get_db", return_value=db_session):
        ws = _make_ws(db_session, status="success")
        with patch("api.workspace_routes.event_bus.last_event_age_seconds", return_value=float('inf')) as mock_check:
            resp = client.get(f"/api/v1/workspaces/{ws.workspace_id}")
        assert resp.status_code == 200
        mock_check.assert_not_called()
