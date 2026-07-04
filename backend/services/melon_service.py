"""
瓜田业务服务层
负责瓜的CRUD、佐证列表、报告查询等业务逻辑
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends
from datetime import datetime, timedelta
import json

from database import get_db
from models import User, Melon, Evidence, Report
from schemas import EvidenceResponse


class MelonService:
    """瓜田服务"""

    def __init__(self, db: Session):
        self.db = db

    def get_melon_list(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[int, list[Melon]]:
        """获取瓜列表，返回 (总数, 列表)"""
        query = self.db.query(Melon)
        if category and category != "全部":
            query = query.filter(Melon.category == category)
        if status:
            query = query.filter(Melon.status == status)
        total = query.count()
        items = query.order_by(Melon.created_at.desc()).offset(skip).limit(limit).all()
        return total, items

    def get_melon_detail(self, melon_id: int) -> Melon:
        """获取瓜详情"""
        melon = self.db.query(Melon).filter(Melon.id == melon_id).first()
        if not melon:
            raise HTTPException(status_code=404, detail="瓜不存在")
        return melon

    def get_evidences(self, melon_id: int) -> tuple[Optional[EvidenceResponse], list[EvidenceResponse]]:
        """获取佐证列表，返回 (最佳佐证, 佐证列表)"""
        melon = self.db.query(Melon).filter(Melon.id == melon_id).first()
        if not melon:
            raise HTTPException(status_code=404, detail="瓜不存在")
        evidences = self.db.query(Evidence).filter(
            Evidence.melon_id == melon_id
        ).order_by(Evidence.upvotes.desc()).all()

        best = None
        evidence_list = []
        for ev in evidences:
            user = self.db.query(User).filter(User.id == ev.user_id).first()
            ev_data = EvidenceResponse(
                id=ev.id,
                user_id=ev.user_id,
                user_nickname=user.nickname if user else "",
                user_avatar=user.avatar if user else "",
                melon_id=ev.melon_id,
                content=ev.content,
                upvotes=ev.upvotes,
                downvotes=ev.downvotes,
                is_best=ev.is_best,
                direction=ev.direction,
                created_at=ev.created_at
            )
            if ev.is_best:
                best = ev_data
            evidence_list.append(ev_data)
        return best, evidence_list

    def get_melon_report(self, melon_id: int) -> dict:
        """获取瓜的报告"""
        melon = self.db.query(Melon).filter(Melon.id == melon_id).first()
        if not melon:
            raise HTTPException(status_code=404, detail="瓜不存在")
        if melon.status != "verified":
            raise HTTPException(status_code=400, detail="尚未开奖")
        report = self.db.query(Report).filter(Report.melon_id == melon_id).first()
        if not report:
            return {
                "melon_id": melon_id,
                "timeline": [
                    {"time": "2024-01-15", "event": "事件首次曝光", "source": "网络流传"},
                    {"time": "2024-01-16", "event": "多方讨论发酵", "source": "社交媒体"},
                    {"time": "2024-01-17", "event": "AI核查完成", "source": "见微AI"},
                ],
                "evidence_chain": [
                    {"description": "官方媒体确认报道", "source": "新华社", "credibility": 5},
                    {"description": "当事人回应", "source": "官方声明", "credibility": 4},
                ],
                "key_doubts": ["部分细节待确认", "信息来源有限"],
                "tendency": "信息属实" if melon.result else "信息存在虚假成分",
                "tendency_direction": melon.result,
                "disclaimer": "AI核查仅供参考，不构成任何建议"
            }
        return {
            "melon_id": melon_id,
            "timeline": json.loads(report.timeline),
            "evidence_chain": json.loads(report.evidence_chain),
            "key_doubts": json.loads(report.key_doubts),
            "tendency": report.tendency,
            "tendency_direction": report.tendency_direction,
            "disclaimer": report.disclaimer
        }

    def create_melon(
        self,
        title: str,
        description: str,
        category: str,
        cover_image: Optional[str],
        creator_id: int
    ) -> Melon:
        """创建瓜"""
        melon = Melon(
            title=title,
            description=description,
            cover_image=cover_image or "",
            category=category,
            creator_id=creator_id,
            status="pending",
            reveal_time=datetime.utcnow() + timedelta(hours=24)
        )
        self.db.add(melon)
        self.db.commit()
        self.db.refresh(melon)
        return melon


def get_melon_service(db: Session = Depends(get_db)) -> MelonService:
    """获取瓜田服务实例"""
    return MelonService(db)
