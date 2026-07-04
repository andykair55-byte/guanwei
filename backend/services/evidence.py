"""
证据链服务层
负责证据链的存储、查询和可信度排序
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import Depends
from datetime import datetime

from database import SessionLocal, get_db
from models import EvidenceChain, Report


# 来源类型可信度基准
SOURCE_CREDIBILITY_BASE = {
    "official": 5,     # 官方来源：最高可信度
    "media": 4,        # 媒体来源：较高可信度
    "social": 2,       # 社交平台：较低可信度
    "forum": 1,        # 论坛来源：最低可信度
}


class EvidenceService:
    """证据链服务"""

    def __init__(self, db: Session):
        self.db = db

    def create_evidence(
        self,
        report_id: int,
        source_url: str,
        source_type: str,
        content_summary: str,
        credibility_level: Optional[int] = None,
        relevance_score: float = 0.0,
        timestamp: Optional[datetime] = None
    ) -> EvidenceChain:
        """创建证据链项"""
        # 自动计算可信度等级（如果未提供）
        if credibility_level is None:
            credibility_level = SOURCE_CREDIBILITY_BASE.get(source_type, 3)

        evidence = EvidenceChain(
            report_id=report_id,
            source_url=source_url,
            source_type=source_type,
            credibility_level=credibility_level,
            content_summary=content_summary,
            relevance_score=relevance_score,
            timestamp=timestamp
        )
        self.db.add(evidence)
        self.db.commit()
        self.db.refresh(evidence)
        return evidence

    def get_evidence_by_report(self, report_id: int) -> List[EvidenceChain]:
        """获取报告的所有证据链（按可信度排序）"""
        return self.db.query(EvidenceChain).filter(
            EvidenceChain.report_id == report_id
        ).order_by(
            desc(EvidenceChain.credibility_level),
            desc(EvidenceChain.relevance_score)
        ).all()

    def get_evidence_by_melon(self, melon_id: int) -> List[EvidenceChain]:
        """通过瓜 ID 获取证据链"""
        # 先查找瓜的报告
        report = self.db.query(Report).filter(Report.melon_id == melon_id).first()
        if not report:
            return []
        return self.get_evidence_by_report(report.id)

    def calculate_credibility_score(self, evidence: EvidenceChain) -> float:
        """
        计算综合可信度评分
        公式：基础可信度 × 相关性评分 × 时间衰减因子
        """
        # 时间衰减因子（7天内的证据权重更高）
        time_decay = 1.0
        if evidence.timestamp:
            days_old = (datetime.utcnow() - evidence.timestamp).days
            if days_old > 7:
                time_decay = 0.8
            if days_old > 30:
                time_decay = 0.5

        # 综合评分
        score = evidence.credibility_level * evidence.relevance_score * time_decay
        return round(score, 2)

    def sort_by_credibility(self, evidences: List[EvidenceChain]) -> List[EvidenceChain]:
        """按综合可信度排序"""
        return sorted(
            evidences,
            key=lambda e: self.calculate_credibility_score(e),
            reverse=True
        )

    def get_top_evidences(self, report_id: int, limit: int = 5) -> List[EvidenceChain]:
        """获取可信度最高的 N 条证据"""
        evidences = self.get_evidence_by_report(report_id)
        return self.sort_by_credibility(evidences)[:limit]

    def update_relevance_score(self, evidence_id: int, score: float) -> bool:
        """更新相关性评分"""
        evidence = self.db.query(EvidenceChain).filter(
            EvidenceChain.id == evidence_id
        ).first()
        if evidence:
            evidence.relevance_score = score
            self.db.commit()
            return True
        return False

    def to_dict(self, evidence: EvidenceChain) -> dict:
        """转换为字典格式（用于 API 返回）"""
        return {
            "id": evidence.id,
            "source_url": evidence.source_url,
            "source_type": evidence.source_type,
            "credibility_level": evidence.credibility_level,
            "credibility_score": self.calculate_credibility_score(evidence),
            "content_summary": evidence.content_summary,
            "relevance_score": evidence.relevance_score,
            "timestamp": evidence.timestamp.isoformat() if evidence.timestamp else None,
            "created_at": evidence.created_at.isoformat()
        }


def get_evidence_service(db: Session = Depends(get_db)) -> EvidenceService:
    """获取证据链服务实例"""
    return EvidenceService(db)