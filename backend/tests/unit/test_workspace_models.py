# backend/tests/unit/test_workspace_models.py
"""工作间数据模型测试"""
import json
from datetime import datetime
from models import Workspace, WorkspaceAgentRun, WorkspaceExperience, PublishTask


def test_workspace_model_fields(db_session):
    """Workspace 表字段完整"""
    ws = Workspace(
        workspace_id="test-uuid-1",
        user_id=None,
        topic="AI换脸诈骗",
        title="测试",
        strategy="dag",
        status="draft",
        platform_order='["guanwei", "zhihu"]',
        draft='{"title": "test"}',
        platform_contents='{}',
        snapshots='[]',
    )
    db_session.add(ws)
    db_session.commit()

    loaded = db_session.query(Workspace).filter(Workspace.workspace_id == "test-uuid-1").first()
    assert loaded is not None
    assert loaded.topic == "AI换脸诈骗"
    assert loaded.strategy == "dag"
    assert json.loads(loaded.platform_order) == ["guanwei", "zhihu"]


def test_workspace_agent_run_model(db_session):
    """WorkspaceAgentRun 表字段完整"""
    ws = Workspace(workspace_id="test-uuid-2", topic="测试", platform_order='[]')
    db_session.add(ws)
    db_session.commit()

    run = WorkspaceAgentRun(
        workspace_id="test-uuid-2",
        agent_type="search",
        status="success",
        duration_ms=1500,
        llm_provider="glm",
        llm_model="glm-4.5-air",
        input_tokens=100,
        output_tokens=200,
        output_result='{"sources": []}',
        retry_count=0,
        prompt_hash="abc123def456abc1",         # 评审 #5
        prompt_injection_blocked=False,         # 评审 #5
        trace_id="test-uuid-2-1700000000",      # 生产加固：trace_id
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db_session.add(run)
    db_session.commit()

    loaded = db_session.query(WorkspaceAgentRun).first()
    assert loaded.agent_type == "search"
    assert loaded.status == "success"
    assert loaded.llm_provider == "glm"
    assert loaded.prompt_hash == "abc123def456abc1"
    assert loaded.prompt_injection_blocked is False
    assert loaded.trace_id == "test-uuid-2-1700000000"


def test_workspace_experience_model(db_session):
    """WorkspaceExperience 表字段完整"""
    exp = WorkspaceExperience(
        task_signature="科技_guanwei+zhihu",
        strategy="dag",
        sample_count=3,
        success_count=2,
        partial_count=1,
        failed_count=0,
        success_rate=1.0,
        avg_duration_ms=95000,
    )
    db_session.add(exp)
    db_session.commit()

    loaded = db_session.query(WorkspaceExperience).first()
    assert loaded.task_signature == "科技_guanwei+zhihu"
    assert loaded.success_rate == 1.0


def test_publish_task_model(db_session):
    """PublishTask 表字段完整"""
    ws = Workspace(workspace_id="test-uuid-3", topic="测试", platform_order='[]')
    db_session.add(ws)
    db_session.commit()

    task = PublishTask(
        workspace_id="test-uuid-3",
        user_id=None,
        platform="zhihu",
        title="测试标题",
        content="测试内容",
        publish_url="https://zhihu.com",
        status="pending",
    )
    db_session.add(task)
    db_session.commit()

    loaded = db_session.query(PublishTask).first()
    assert loaded.platform == "zhihu"
    assert loaded.status == "pending"
