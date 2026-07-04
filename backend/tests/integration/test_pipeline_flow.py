"""
Pipeline 流程集成测试（最高优先级）
测试 Pipeline 完整流程：异步提交、状态查询、状态流转
使用 Mock LLM，不产生真实费用
"""
import pytest
import json
import time
from unittest.mock import patch, AsyncMock
from models import PipelineRun


class TestPipelineSubmission:
    """Pipeline 提交测试"""

    def test_verify_submit_returns_pending(self, client, db_session):
        """测试 POST /verify 提交求证，立即返回 pending 状态和 pipeline_id"""
        with patch("api.routes.orchestrator.run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = {
                "success": True,
                "analysis": {
                    "timeline": [],
                    "evidence_chain": [],
                    "key_doubts": [],
                    "tendency": "无法判断",
                    "tendency_direction": False,
                    "disclaimer": "AI核查仅供参考"
                },
                "sources_count": 0,
                "events": [],
                "agent_pool_state": None,
                "checkpoint_count": 0
            }

            response = client.post(
                "/api/v1/verify",
                json={
                    "content": "测试求证内容：某明星出轨事件是真的吗？",
                    "type": "text"
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "pipeline_id" in data
        assert data["status"] == "pending"
        assert data["pipeline_id"] is not None

    def test_verify_creates_pipeline_run_record(self, client, db_session):
        """测试 PipelineRun 数据库记录正确创建"""
        with patch("api.routes.orchestrator.run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = {
                "success": True,
                "analysis": {},
                "sources_count": 0,
                "events": [],
                "agent_pool_state": None,
                "checkpoint_count": 0
            }

            response = client.post(
                "/api/v1/verify",
                json={
                    "content": "测试数据库记录",
                    "type": "text"
                }
            )

        pipeline_id = response.json()["pipeline_id"]
        run = db_session.query(PipelineRun).filter(
            PipelineRun.pipeline_id == pipeline_id
        ).first()

        assert run is not None
        assert run.pipeline_id == pipeline_id
        assert run.input_content == "测试数据库记录"
        assert run.status == "pending"
        assert run.duration_ms == 0


class TestPipelineStatusQuery:
    """Pipeline 状态查询测试"""

    def test_get_pipeline_status_pending(self, client, db_session):
        """测试 GET /pipeline/{id} 可查询 pending 状态"""
        run = PipelineRun(
            pipeline_id="test-pipeline-pending",
            input_content="测试查询内容",
            status="pending"
        )
        db_session.add(run)
        db_session.commit()

        response = client.get("/api/v1/pipeline/test-pipeline-pending")
        assert response.status_code == 200
        data = response.json()
        assert data["pipeline_id"] == "test-pipeline-pending"
        assert data["status"] == "pending"
        assert data["duration_ms"] == 0
        assert "node_results" in data
        assert "created_at" in data

    def test_get_pipeline_status_running(self, client, db_session):
        """测试 GET /pipeline/{id} 可查询 running 状态"""
        run = PipelineRun(
            pipeline_id="test-pipeline-running",
            input_content="测试运行中",
            status="running",
            duration_ms=1000
        )
        db_session.add(run)
        db_session.commit()

        response = client.get("/api/v1/pipeline/test-pipeline-running")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["duration_ms"] == 1000

    def test_get_pipeline_status_success(self, client, db_session):
        """测试 GET /pipeline/{id} 可查询 success 状态"""
        run = PipelineRun(
            pipeline_id="test-pipeline-success",
            input_content="测试成功",
            status="success",
            duration_ms=5000,
            node_results=json.dumps({
                "moderation_result": "success",
                "analysis_result": "success"
            }, ensure_ascii=False)
        )
        db_session.add(run)
        db_session.commit()

        response = client.get("/api/v1/pipeline/test-pipeline-success")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["duration_ms"] == 5000
        assert data["node_results"]["moderation_result"] == "success"

    def test_get_pipeline_status_failed(self, client, db_session):
        """测试 GET /pipeline/{id} 可查询 failed 状态"""
        run = PipelineRun(
            pipeline_id="test-pipeline-failed",
            input_content="测试失败",
            status="failed",
            duration_ms=3000,
            error_message="模拟执行失败错误"
        )
        db_session.add(run)
        db_session.commit()

        response = client.get("/api/v1/pipeline/test-pipeline-failed")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        assert data["error_message"] == "模拟执行失败错误"

    def test_get_nonexistent_pipeline_returns_404(self, client):
        """测试不存在的 pipeline_id 返回404"""
        response = client.get("/api/v1/pipeline/nonexistent-pipeline-id")
        assert response.status_code == 404


class TestPipelineStateFlow:
    """Pipeline 状态流转测试（通过直接操作数据库验证状态查询正确性）"""

    def test_pipeline_status_transitions(self, client, db_session):
        """测试验证状态流转：pending → running → success"""
        run = PipelineRun(
            pipeline_id="test-state-transition",
            input_content="测试状态流转",
            status="pending"
        )
        db_session.add(run)
        db_session.commit()

        resp1 = client.get("/api/v1/pipeline/test-state-transition")
        assert resp1.json()["status"] == "pending"

        run.status = "running"
        run.duration_ms = 500
        db_session.commit()

        resp2 = client.get("/api/v1/pipeline/test-state-transition")
        assert resp2.json()["status"] == "running"
        assert resp2.json()["duration_ms"] == 500

        run.status = "success"
        run.duration_ms = 2000
        run.node_results = json.dumps({"analysis_result": "success"}, ensure_ascii=False)
        db_session.commit()

        resp3 = client.get("/api/v1/pipeline/test-state-transition")
        assert resp3.json()["status"] == "success"
        assert resp3.json()["duration_ms"] == 2000

    def test_pipeline_failed_transition(self, client, db_session):
        """测试验证状态流转：pending → running → failed"""
        run = PipelineRun(
            pipeline_id="test-failed-transition",
            input_content="测试失败流转",
            status="pending"
        )
        db_session.add(run)
        db_session.commit()

        run.status = "running"
        db_session.commit()

        run.status = "failed"
        run.error_message="执行出错了"
        run.duration_ms = 1500
        db_session.commit()

        resp = client.get("/api/v1/pipeline/test-failed-transition")
        assert resp.json()["status"] == "failed"
        assert resp.json()["error_message"] == "执行出错了"
        assert resp.json()["duration_ms"] == 1500

    def test_pipeline_run_node_results(self, client, db_session):
        """测试 PipelineRun 的 node_results 字段正确存储"""
        run = PipelineRun(
            pipeline_id="test-node-results",
            input_content="测试节点结果",
            status="success",
            duration_ms=5000,
            node_results=json.dumps({
                "moderation_result": "success",
                "collected_sources": "success",
                "verified_sources": "success",
                "analysis_result": "success"
            }, ensure_ascii=False)
        )
        db_session.add(run)
        db_session.commit()

        response = client.get("/api/v1/pipeline/test-node-results")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "node_results" in data
        assert data["node_results"]["moderation_result"] == "success"
        assert data["node_results"]["analysis_result"] == "success"


class TestPipelineEdgeCases:
    """Pipeline 边界测试"""

    def test_empty_content(self, client):
        """测试空内容提交"""
        with patch("api.routes.orchestrator.run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = {
                "success": True,
                "analysis": {},
                "sources_count": 0,
                "events": [],
                "agent_pool_state": None,
                "checkpoint_count": 0
            }

            response = client.post(
                "/api/v1/verify",
                json={
                    "content": "",
                    "type": "text"
                }
            )

        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_long_content(self, client, db_session):
        """测试长内容提交（截断到2000字符）"""
        long_content = "测试内容" * 500

        with patch("api.routes.orchestrator.run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = {
                "success": True,
                "analysis": {},
                "sources_count": 0,
                "events": [],
                "agent_pool_state": None,
                "checkpoint_count": 0
            }

            response = client.post(
                "/api/v1/verify",
                json={
                    "content": long_content,
                    "type": "text"
                }
            )

        pipeline_id = response.json()["pipeline_id"]
        run = db_session.query(PipelineRun).filter(
            PipelineRun.pipeline_id == pipeline_id
        ).first()

        assert run is not None
        assert len(run.input_content) <= 2000

    def test_multiple_pipeline_submissions(self, client, db_session):
        """测试多次提交 Pipeline"""
        with patch("api.routes.orchestrator.run", new_callable=AsyncMock) as mock_run:
            mock_run.return_value = {
                "success": True,
                "analysis": {},
                "sources_count": 0,
                "events": [],
                "agent_pool_state": None,
                "checkpoint_count": 0
            }

            pipeline_ids = []
            for i in range(3):
                response = client.post(
                    "/api/v1/verify",
                    json={
                        "content": f"测试提交第{i+1}次",
                        "type": "text"
                    }
                )
                assert response.status_code == 200
                pipeline_ids.append(response.json()["pipeline_id"])

        assert len(pipeline_ids) == 3
        assert len(set(pipeline_ids)) == 3

        for pid in pipeline_ids:
            run = db_session.query(PipelineRun).filter(
                PipelineRun.pipeline_id == pid
            ).first()
            assert run is not None


class TestCompletePipelineFlow:
    """完整 Pipeline 流程测试"""

    def test_complete_pipeline_flow(self, client, db_session):
        """测试完整 Pipeline 流程：提交→查询状态变更→边界检查"""
        submit_resp = client.post(
            "/api/v1/verify",
            json={
                "content": "某科技公司发布新产品，请问是真的吗？",
                "type": "text"
            }
        )

        assert submit_resp.status_code == 200
        submit_data = submit_resp.json()
        pipeline_id = submit_data["pipeline_id"]
        assert submit_data["status"] == "pending"

        initial_query = client.get(f"/api/v1/pipeline/{pipeline_id}")
        assert initial_query.status_code == 200
        assert initial_query.json()["status"] == "pending"

        run = db_session.query(PipelineRun).filter(
            PipelineRun.pipeline_id == pipeline_id
        ).first()
        assert run is not None
        assert run.input_content == "某科技公司发布新产品，请问是真的吗？"
        assert run.status == "pending"

        run.status = "running"
        run.duration_ms = 1000
        db_session.commit()

        running_query = client.get(f"/api/v1/pipeline/{pipeline_id}")
        assert running_query.status_code == 200
        assert running_query.json()["status"] == "running"
        assert running_query.json()["duration_ms"] == 1000

        run.status = "success"
        run.duration_ms = 5000
        run.node_results = json.dumps({
            "moderation_result": "success",
            "collected_sources": "success",
            "verified_sources": "success",
            "analysis_result": "success"
        }, ensure_ascii=False)
        db_session.commit()

        final_query = client.get(f"/api/v1/pipeline/{pipeline_id}")
        assert final_query.status_code == 200
        final_data = final_query.json()

        assert final_data["status"] == "success"
        assert final_data["duration_ms"] == 5000
        assert final_data["error_message"] == ""
        assert "node_results" in final_data
        assert len(final_data["node_results"]) > 0

        not_found_resp = client.get("/api/v1/pipeline/nonexistent-id")
        assert not_found_resp.status_code == 404
