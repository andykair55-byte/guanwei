# backend/tests/integration/test_workspace_api.py
"""工作间 API 集成测试"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def test_create_workspace(client, db_session):
    with patch("api.workspace_routes.get_db", return_value=db_session):
        resp = client.post("/api/v1/workspaces", json={
            "topic": "AI换脸诈骗",
            "platform_order": ["guanwei", "zhihu"],
        })
    assert resp.status_code == 200
    data = resp.json()
    assert data["topic"] == "AI换脸诈骗"
    assert data["status"] == "draft"
    assert data["workspace_id"]  # UUID


def test_get_workspace(client, db_session):
    # 先创建
    with patch("api.workspace_routes.get_db", return_value=db_session):
        resp = client.post("/api/v1/workspaces", json={"topic": "测试"})
        ws_id = resp.json()["workspace_id"]

        resp = client.get(f"/api/v1/workspaces/{ws_id}")
    assert resp.status_code == 200
    assert resp.json()["workspace_id"] == ws_id


def test_get_workspace_not_found(client, db_session):
    with patch("api.workspace_routes.get_db", return_value=db_session):
        resp = client.get("/api/v1/workspaces/nonexistent")
    assert resp.status_code == 404


def test_delete_workspace(client, db_session):
    with patch("api.workspace_routes.get_db", return_value=db_session):
        resp = client.post("/api/v1/workspaces", json={"topic": "测试"})
        ws_id = resp.json()["workspace_id"]

        resp = client.delete(f"/api/v1/workspaces/{ws_id}")
        assert resp.status_code == 200

        resp = client.get(f"/api/v1/workspaces/{ws_id}")
        assert resp.status_code == 404


def test_list_workspaces(client, db_session):
    with patch("api.workspace_routes.get_db", return_value=db_session):
        for i in range(3):
            client.post("/api/v1/workspaces", json={"topic": f"测试{i}"})

        resp = client.get("/api/v1/workspaces")
    assert resp.status_code == 200
    assert len(resp.json()) == 3
