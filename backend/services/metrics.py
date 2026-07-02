"""
监控指标服务层
用于采集系统运行状态、用户行为数据、业务指标
"""
from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import User, Melon, Guess, Evidence, PointsRecord


class MetricsService:
    """监控指标服务"""

    def __init__(self, db: Session):
        self.db = db

    # === 系统指标 ===

    def get_system_metrics(self) -> Dict[str, Any]:
        """获取系统指标"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "database": self._get_database_metrics(),
            "users": self._get_user_metrics(),
            "melons": self._get_melon_metrics(),
        }

    def _get_database_metrics(self) -> Dict[str, Any]:
        """获取数据库指标"""
        # 表记录数
        user_count = self.db.query(func.count(User.id)).scalar()
        melon_count = self.db.query(func.count(Melon.id)).scalar()
        guess_count = self.db.query(func.count(Guess.id)).scalar()
        evidence_count = self.db.query(func.count(Evidence.id)).scalar()

        return {
            "tables": {
                "users": user_count,
                "melons": melon_count,
                "guesses": guess_count,
                "evidences": evidence_count,
            }
        }

    def _get_user_metrics(self) -> Dict[str, Any]:
        """获取用户指标"""
        # 总用户数
        total_users = self.db.query(func.count(User.id)).scalar()

        # 今日活跃用户（有积分记录）
        today = datetime.utcnow().date()
        active_today = self.db.query(func.count(PointsRecord.user_id.distinct())).filter(
            func.date(PointsRecord.created_at) == today
        ).scalar()

        # 本周活跃用户
        week_start = today - timedelta(days=today.weekday())
        active_this_week = self.db.query(func.count(PointsRecord.user_id.distinct())).filter(
            func.date(PointsRecord.created_at) >= week_start
        ).scalar()

        return {
            "total": total_users,
            "active_today": active_today or 0,
            "active_this_week": active_this_week or 0,
        }

    def _get_melon_metrics(self) -> Dict[str, Any]:
        """获取瓜田指标"""
        # 总瓜数
        total_melons = self.db.query(func.count(Melon.id)).scalar()

        # 待开奖瓜数
        pending_melons = self.db.query(func.count(Melon.id)).filter(
            Melon.status == "pending"
        ).scalar()

        # 已开奖瓜数
        revealed_melons = self.db.query(func.count(Melon.id)).filter(
            Melon.status == "revealed"
        ).scalar()

        return {
            "total": total_melons,
            "pending": pending_melons or 0,
            "revealed": revealed_melons or 0,
        }

    # === 业务指标 ===

    def get_business_metrics(self) -> Dict[str, Any]:
        """获取业务指标"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "guess": self._get_guess_metrics(),
            "evidence": self._get_evidence_metrics(),
            "points": self._get_points_metrics(),
        }

    def _get_guess_metrics(self) -> Dict[str, Any]:
        """获取猜瓜指标"""
        # 总猜测次数
        total_guesses = self.db.query(func.count(Guess.id)).scalar()

        # 正确次数
        correct_guesses = self.db.query(func.count(Guess.id)).filter(
            Guess.is_correct == True
        ).scalar()

        # 正确率
        accuracy_rate = correct_guesses / total_guesses if total_guesses > 0 else 0

        # 今日猜测次数
        today = datetime.utcnow().date()
        guesses_today = self.db.query(func.count(Guess.id)).filter(
            func.date(Guess.guessed_at) == today
        ).scalar()

        return {
            "total": total_guesses or 0,
            "correct": correct_guesses or 0,
            "accuracy_rate": round(accuracy_rate, 3),
            "today": guesses_today or 0,
        }

    def _get_evidence_metrics(self) -> Dict[str, Any]:
        """获取佐证指标"""
        # 总佐证数
        total_evidences = self.db.query(func.count(Evidence.id)).scalar()

        # 最佳佐证数
        best_evidences = self.db.query(func.count(Evidence.id)).filter(
            Evidence.is_best == True
        ).scalar()

        # 今日佐证数
        today = datetime.utcnow().date()
        evidences_today = self.db.query(func.count(Evidence.id)).filter(
            func.date(Evidence.created_at) == today
        ).scalar()

        # 佐证提交率（有佐证的猜测 / 总猜测）
        guesses_with_evidence = self.db.query(func.count(Guess.id)).filter(
            Guess.evidence != None
        ).scalar()
        total_guesses = self.db.query(func.count(Guess.id)).scalar()
        submission_rate = guesses_with_evidence / total_guesses if total_guesses > 0 else 0

        return {
            "total": total_evidences or 0,
            "best": best_evidences or 0,
            "today": evidences_today or 0,
            "submission_rate": round(submission_rate, 3),
        }

    def _get_points_metrics(self) -> Dict[str, Any]:
        """获取积分指标"""
        # 今日获取积分
        today = datetime.utcnow().date()
        earned_today = self.db.query(func.sum(PointsRecord.amount)).filter(
            func.date(PointsRecord.created_at) == today,
            PointsRecord.amount > 0
        ).scalar()

        # 今日消耗积分
        spent_today = self.db.query(func.sum(PointsRecord.amount)).filter(
            func.date(PointsRecord.created_at) == today,
            PointsRecord.amount < 0
        ).scalar()

        # 积分消耗率
        total_earned = self.db.query(func.sum(PointsRecord.amount)).filter(
            PointsRecord.amount > 0
        ).scalar()
        total_spent = self.db.query(func.sum(PointsRecord.amount)).filter(
            PointsRecord.amount < 0
        ).scalar()
        consumption_rate = abs(total_spent) / total_earned if total_earned > 0 else 0

        return {
            "earned_today": earned_today or 0,
            "spent_today": abs(spent_today or 0),
            "consumption_rate": round(consumption_rate, 3),
        }

    # === 段位分布 ===

    def get_rank_distribution(self) -> Dict[str, int]:
        """获取段位分布"""
        ranks = self.db.query(User.rank, func.count(User.id)).group_by(User.rank).all()
        return {rank: count for rank, count in ranks}


def get_metrics_service(db: Session) -> MetricsService:
    """获取监控指标服务实例"""
    return MetricsService(db)