# backend/services/workspace/experience.py
"""经验存储 — 结构化运行历史查询与聚合"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database import SessionLocal
from models import WorkspaceExperience, Workspace
from services.workspace.signature import classify_topic, compute_task_signature

logger = logging.getLogger(__name__)

MIN_SAMPLE_FOR_RECOMMEND = 3
RECOMMEND_SUCCESS_RATE_THRESHOLD = 0.75
EXPERIENCE_TTL_DAYS = 30


class ExperienceStore:
    """经验存储 — 单例"""

    async def recommend_strategy(
        self,
        topic: str,
        platform_order: list[str],
    ) -> Optional[str]:
        """查询历史经验，推荐策略"""
        db = SessionLocal()
        try:
            category = await classify_topic(topic)
            signature = compute_task_signature(category, platform_order)

            cutoff = datetime.utcnow() - timedelta(days=EXPERIENCE_TTL_DAYS)
            rows = db.query(WorkspaceExperience).filter(
                WorkspaceExperience.task_signature == signature,
                WorkspaceExperience.last_updated >= cutoff,
                WorkspaceExperience.sample_count >= MIN_SAMPLE_FOR_RECOMMEND,
            ).all()

            if not rows:
                return None

            best = max(rows, key=lambda r: r.success_rate)
            if best.success_rate >= RECOMMEND_SUCCESS_RATE_THRESHOLD:
                logger.info(
                    f"[Experience] 推荐 {signature} → {best.strategy} "
                    f"(成功率 {best.success_rate:.2%}, 样本 {best.sample_count})"
                )
                return best.strategy
            return None
        finally:
            db.close()

    async def record_run(self, workspace: Workspace, agent_runs: list[dict]) -> None:
        """运行完成后，记录样本并更新经验聚合"""
        db = SessionLocal()
        try:
            import json
            platform_order = json.loads(workspace.platform_order or "[]")
            category = await classify_topic(workspace.topic)
            signature = compute_task_signature(category, platform_order)

            overall_status = self._classify_overall_status(workspace.status, agent_runs)
            total_duration = sum(r.get("duration_ms", 0) for r in agent_runs)

            exp = db.query(WorkspaceExperience).filter(
                WorkspaceExperience.task_signature == signature,
                WorkspaceExperience.strategy == workspace.strategy,
            ).first()

            if not exp:
                exp = WorkspaceExperience(
                    task_signature=signature,
                    strategy=workspace.strategy,
                    sample_count=0,
                    success_count=0,
                    partial_count=0,
                    failed_count=0,
                    success_rate=0.0,
                    avg_duration_ms=0,
                    avg_quality_score=0.0,
                )
                db.add(exp)

            exp.sample_count += 1
            if overall_status == "success":
                exp.success_count += 1
            elif overall_status == "partial":
                exp.partial_count += 1
            else:
                exp.failed_count += 1

            usable = exp.success_count + exp.partial_count
            exp.success_rate = usable / exp.sample_count if exp.sample_count > 0 else 0

            if exp.sample_count > 0:
                exp.avg_duration_ms = int(
                    (exp.avg_duration_ms * (exp.sample_count - 1) + total_duration)
                    / exp.sample_count
                )

            exp.last_strategy_used = workspace.strategy
            exp.last_task_topic = workspace.topic[:500]
            exp.last_updated = datetime.utcnow()

            db.commit()
            logger.info(
                f"[Experience] 记录 {signature} / {workspace.strategy} → {overall_status} "
                f"(总样本 {exp.sample_count}, 成功率 {exp.success_rate:.2%})"
            )
        except Exception as e:
            logger.exception(f"[Experience] 记录失败: {e}")
            db.rollback()
        finally:
            db.close()

    def _classify_overall_status(self, workspace_status: str, agent_runs: list[dict]) -> str:
        """评审 #4：基于关键节点 + 阈值的状态分类
        规则：
        1. workspace 已 failed → failed（最高优先级）
        2. writing 节点降级 → failed（核心产出不可用）
        3. 降级节点数 >= 2 → failed（系统性故障）
        4. 降级节点数 == 1（非 writing）→ partial
        5. 全部正常 → success
        """
        if workspace_status == "failed":
            return "failed"

        degraded_agents = [
            r.get("agent_type", "") for r in agent_runs
            if r.get("status") in ("degraded", "failed")
        ]
        degraded_count = len(degraded_agents)

        if "writing" in degraded_agents:
            return "failed"
        if degraded_count >= 2:
            return "failed"
        if degraded_count == 1:
            return "partial"
        return "success"


experience_store = ExperienceStore()
