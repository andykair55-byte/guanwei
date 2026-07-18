# backend/tests/unit/test_workspace_experience.py
"""ExperienceStore 测试"""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime

from services.workspace.experience import ExperienceStore, experience_store
from models import WorkspaceExperience, Workspace


@pytest.mark.asyncio
async def test_recommend_strategy_no_history(db_session):
    """无历史经验 → 返回 None"""
    with patch("services.workspace.experience.SessionLocal", return_value=db_session):
        with patch("services.workspace.experience.classify_topic", AsyncMock(return_value="科技")):
            result = await experience_store.recommend_strategy("AI技术", ["guanwei", "zhihu"])
    assert result is None


@pytest.mark.asyncio
async def test_recommend_strategy_with_history(db_session):
    """有历史经验且成功率达标 → 返回推荐策略"""
    db_session.add(WorkspaceExperience(
        task_signature="科技_guanwei+zhihu",
        strategy="dag",
        sample_count=5,
        success_count=4,
        partial_count=1,
        success_rate=1.0,
        avg_duration_ms=95000,
        last_updated=datetime.utcnow(),
    ))
    db_session.commit()

    with patch("services.workspace.experience.SessionLocal", return_value=db_session):
        with patch("services.workspace.experience.classify_topic", AsyncMock(return_value="科技")):
            result = await experience_store.recommend_strategy("AI技术", ["guanwei", "zhihu"])

    assert result == "dag"


@pytest.mark.asyncio
async def test_recommend_strategy_low_success_rate(db_session):
    """成功率不达标 → 返回 None"""
    db_session.add(WorkspaceExperience(
        task_signature="科技_guanwei+zhihu",
        strategy="serial",
        sample_count=5,
        success_count=1,
        partial_count=1,
        failed_count=3,
        success_rate=0.4,
        last_updated=datetime.utcnow(),
    ))
    db_session.commit()

    with patch("services.workspace.experience.SessionLocal", return_value=db_session):
        with patch("services.workspace.experience.classify_topic", AsyncMock(return_value="科技")):
            result = await experience_store.recommend_strategy("AI技术", ["guanwei", "zhihu"])

    assert result is None


@pytest.mark.asyncio
async def test_record_run_success(db_session):
    """记录成功运行 → 增量更新经验表"""
    ws = Workspace(
        workspace_id="ws-1", topic="AI技术",
        strategy="dag", status="success",
        platform_order='["guanwei","zhihu"]',
    )
    db_session.add(ws)
    db_session.commit()

    agent_runs = [
        {"agent_type": "search", "status": "success", "duration_ms": 15000},
        {"agent_type": "research", "status": "success", "duration_ms": 20000},
    ]

    with patch("services.workspace.experience.SessionLocal", return_value=db_session):
        with patch("services.workspace.experience.classify_topic", AsyncMock(return_value="科技")):
            await experience_store.record_run(ws, agent_runs)

    exp = db_session.query(WorkspaceExperience).first()
    assert exp is not None
    assert exp.sample_count == 1
    assert exp.success_count == 1
    assert exp.partial_count == 0
    assert exp.success_rate == 1.0


@pytest.mark.asyncio
async def test_record_run_partial(db_session):
    """记录降级运行 → 计入 partial"""
    ws = Workspace(
        workspace_id="ws-2", topic="AI技术",
        strategy="dag", status="success",
        platform_order='["guanwei","zhihu"]',
    )
    db_session.add(ws)
    db_session.commit()

    agent_runs = [
        {"agent_type": "search", "status": "degraded", "duration_ms": 30000},
        {"agent_type": "research", "status": "success", "duration_ms": 20000},
    ]

    with patch("services.workspace.experience.SessionLocal", return_value=db_session):
        with patch("services.workspace.experience.classify_topic", AsyncMock(return_value="科技")):
            await experience_store.record_run(ws, agent_runs)

    exp = db_session.query(WorkspaceExperience).first()
    assert exp.partial_count == 1
    assert exp.success_rate == 1.0  # partial 也算可用


# 评审 #4：整体状态分类阈值规则测试
def test_classify_overall_status_all_success():
    """全部正常 → success"""
    store = ExperienceStore()
    agent_runs = [
        {"agent_type": "search", "status": "success"},
        {"agent_type": "research", "status": "success"},
        {"agent_type": "writing", "status": "success"},
    ]
    assert store._classify_overall_status("success", agent_runs) == "success"


def test_classify_overall_status_single_non_writing_degraded():
    """单节点降级（非 writing）→ partial"""
    store = ExperienceStore()
    agent_runs = [
        {"agent_type": "search", "status": "degraded"},
        {"agent_type": "research", "status": "success"},
        {"agent_type": "writing", "status": "success"},
    ]
    assert store._classify_overall_status("success", agent_runs) == "partial"


def test_classify_overall_status_writing_degraded():
    """writing 节点降级 → failed（核心节点不可用）"""
    store = ExperienceStore()
    agent_runs = [
        {"agent_type": "search", "status": "success"},
        {"agent_type": "research", "status": "success"},
        {"agent_type": "writing", "status": "degraded"},
    ]
    assert store._classify_overall_status("success", agent_runs) == "failed"


def test_classify_overall_status_two_degraded():
    """2 节点降级 → failed（系统性故障）"""
    store = ExperienceStore()
    agent_runs = [
        {"agent_type": "search", "status": "degraded"},
        {"agent_type": "research", "status": "degraded"},
        {"agent_type": "writing", "status": "success"},
    ]
    assert store._classify_overall_status("success", agent_runs) == "failed"


def test_classify_overall_status_workspace_failed():
    """workspace 已 failed → failed（最高优先级）"""
    store = ExperienceStore()
    agent_runs = [
        {"agent_type": "search", "status": "success"},
        {"agent_type": "writing", "status": "success"},
    ]
    assert store._classify_overall_status("failed", agent_runs) == "failed"
