# backend/tests/integration/test_workspace_flow.py
"""端到端流程测试 — mock LLM 调用"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


@pytest.mark.asyncio
async def test_full_workspace_flow(client, db_session):
    """创建 → 运行 → 查询状态 → 查询 runs"""
    with patch("api.workspace_routes.get_db", return_value=db_session):
        # 1. 创建
        resp = client.post("/api/v1/workspaces", json={
            "topic": "AI换脸诈骗",
            "platform_order": ["guanwei", "zhihu"],
        })
        ws_id = resp.json()["workspace_id"]

        # 2. mock engine.run 直接返回成功结果
        mock_result = {
            "success": True,
            "partial": False,
            "workspace_id": ws_id,
            "strategy": "dag",
            "draft": {"title": "测试", "summary": "摘要"},
            "platform_contents": {"guanwei": {"title": "g", "content": "g-c"}},
            "agent_runs": [
                {"agent_type": "search", "status": "success", "duration_ms": 1000, "started_at": None, "completed_at": None},
            ],
            "duration_ms": 5000,
        }

        with patch("services.workspace.engine.workspace_engine.run", AsyncMock(return_value=mock_result)):
            with patch("services.workspace.experience.experience_store.record_run", AsyncMock()):
                resp = client.post(f"/api/v1/workspaces/{ws_id}/run", json={"strategy": "dag"})
                assert resp.status_code == 200

                # 等待后台任务
                await asyncio.sleep(0.5)

        # 3. 查询状态
        resp = client.get(f"/api/v1/workspaces/{ws_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["draft"]["title"] == "测试"

        # 4. 查询 agent runs
        resp = client.get(f"/api/v1/workspaces/{ws_id}/runs")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
