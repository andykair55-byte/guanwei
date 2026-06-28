"""瓜田相关 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import json

from database import get_db
from models import User, Melon, Guess, Evidence, PointsRecord, Report
from schemas import (
    MelonCreate, MelonResponse, MelonListResponse,
    GuessCreate, GuessResponse,
    EvidenceResponse, EvidenceListResponse
)
from auth import get_current_user, require_current_user
from ranks import calculate_rank

router = APIRouter(prefix="/melons", tags=["瓜田"])

@router.get("", response_model=MelonListResponse)
def get_melon_list(
    category: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(Melon)
    if category and category != "全部":
        query = query.filter(Melon.category == category)
    if status:
        query = query.filter(Melon.status == status)
    total = query.count()
    items = query.order_by(Melon.created_at.desc()).offset(skip).limit(limit).all()
    return MelonListResponse(total=total, items=items)

@router.get("/{melon_id}", response_model=MelonResponse)
def get_melon_detail(melon_id: int, db: Session = Depends(get_db)):
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")
    return melon

@router.post("/{melon_id}/guess", response_model=GuessResponse)
def submit_guess(
    melon_id: int,
    guess_data: GuessCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")
    
    existing_guess = db.query(Guess).filter(
        Guess.user_id == current_user.id,
        Guess.melon_id == melon_id
    ).first()
    if existing_guess:
        raise HTTPException(status_code=400, detail="你已经猜过了")
    
    guess = Guess(
        user_id=current_user.id,
        melon_id=melon_id,
        choice=guess_data.choice
    )
    db.add(guess)
    db.flush()
    
    melon.participant_count += 1
    if guess_data.choice:
        melon.true_count += 1
    else:
        melon.false_count += 1
    
    current_user.total_guesses += 1
    
    if melon.result is not None:
        is_correct = (guess_data.choice == melon.result)
        guess.is_correct = is_correct
        if is_correct:
            current_user.correct_guesses += 1
            points_earned = 30
            guess.points_earned = points_earned
            current_user.points += points_earned
            record = PointsRecord(
                user_id=current_user.id,
                amount=points_earned,
                type="guess_correct",
                description=f"猜对「{melon.title[:20]}」"
            )
            db.add(record)
    
    if guess_data.evidence_content:
        evidence = Evidence(
            user_id=current_user.id,
            melon_id=melon_id,
            guess_id=guess.id,
            content=guess_data.evidence_content,
            direction=guess_data.choice
        )
        db.add(evidence)
        current_user.points += 5
        record = PointsRecord(
            user_id=current_user.id,
            amount=5,
            type="guess_correct",
            description="提交佐证"
        )
        db.add(record)
    
    current_user.rank = calculate_rank(current_user.correct_guesses, current_user.total_guesses)
    
    db.commit()
    db.refresh(guess)
    return guess

@router.get("/{melon_id}/my-guess")
def get_my_guess(
    melon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {"guess": None, "evidence": None}
    guess = db.query(Guess).filter(
        Guess.user_id == current_user.id,
        Guess.melon_id == melon_id
    ).first()
    if not guess:
        return {"guess": None, "evidence": None}
    evidence = db.query(Evidence).filter(Evidence.guess_id == guess.id).first()
    return {
        "guess": {
            "id": guess.id,
            "choice": guess.choice,
            "is_correct": guess.is_correct,
            "points_earned": guess.points_earned,
            "guessed_at": guess.guessed_at
        },
        "evidence": EvidenceResponse(
            id=evidence.id,
            user_id=evidence.user_id,
            user_nickname=current_user.nickname,
            user_avatar=current_user.avatar,
            melon_id=evidence.melon_id,
            content=evidence.content,
            upvotes=evidence.upvotes,
            downvotes=evidence.downvotes,
            is_best=evidence.is_best,
            direction=evidence.direction,
            created_at=evidence.created_at
        ).dict() if evidence else None
    }

@router.get("/{melon_id}/evidences", response_model=EvidenceListResponse)
def get_evidences(melon_id: int, db: Session = Depends(get_db)):
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")
    evidences = db.query(Evidence).filter(
        Evidence.melon_id == melon_id
    ).order_by(Evidence.upvotes.desc()).all()
    
    best = None
    evidence_list = []
    for ev in evidences:
        user = db.query(User).filter(User.id == ev.user_id).first()
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
    return EvidenceListResponse(best=best, list=evidence_list)

@router.post("/evidences/{evidence_id}/upvote")
def upvote_evidence(
    evidence_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="佐证不存在")
    evidence.upvotes += 1
    author = db.query(User).filter(User.id == evidence.user_id).first()
    if author and author.id != current_user.id:
        author.points += 2
        record = PointsRecord(
            user_id=author.id,
            amount=2,
            type="guess_correct",
            description="佐证被点赞"
        )
        db.add(record)
    db.commit()
    return {"success": True, "upvotes": evidence.upvotes}

@router.post("/evidences/{evidence_id}/downvote")
def downvote_evidence(
    evidence_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="佐证不存在")
    evidence.downvotes += 1
    db.commit()
    return {"success": True, "downvotes": evidence.downvotes}

@router.get("/{melon_id}/report")
def get_melon_report(melon_id: int, db: Session = Depends(get_db)):
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")
    if melon.status != "verified":
        raise HTTPException(status_code=400, detail="尚未开奖")
    report = db.query(Report).filter(Report.melon_id == melon_id).first()
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

@router.post("", response_model=MelonResponse)
def create_melon(
    melon_data: MelonCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    melon = Melon(
        title=melon_data.title,
        description=melon_data.description,
        cover_image=melon_data.cover_image or "",
        category=melon_data.category,
        creator_id=current_user.id,
        status="pending",
        reveal_time=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(melon)
    db.commit()
    db.refresh(melon)
    return melon
