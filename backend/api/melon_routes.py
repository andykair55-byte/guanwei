"""瓜田相关 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from schemas import (
    MelonCreate, MelonResponse, MelonListResponse,
    GuessCreate, GuessResponse,
    EvidenceListResponse
)
from auth import get_current_user, require_current_user
from services.guess_service import GuessService
from services.melon_service import MelonService

router = APIRouter(prefix="/melons", tags=["瓜田"])

@router.get("", response_model=MelonListResponse)
def get_melon_list(
    category: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    service = MelonService(db)
    total, items = service.get_melon_list(category=category, status=status, skip=skip, limit=limit)
    return MelonListResponse(total=total, items=items)

@router.get("/{melon_id}", response_model=MelonResponse)
def get_melon_detail(melon_id: int, db: Session = Depends(get_db)):
    service = MelonService(db)
    return service.get_melon_detail(melon_id=melon_id)

@router.post("/{melon_id}/guess", response_model=GuessResponse)
def submit_guess(
    melon_id: int,
    guess_data: GuessCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    service = GuessService(db)
    return service.submit_guess(
        user_id=current_user.id,
        melon_id=melon_id,
        choice=guess_data.choice,
        evidence_content=guess_data.evidence_content
    )

@router.get("/{melon_id}/my-guess")
def get_my_guess(
    melon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return {"guess": None, "evidence": None}
    service = GuessService(db)
    return service.get_my_guess(user_id=current_user.id, melon_id=melon_id)

@router.get("/{melon_id}/evidences", response_model=EvidenceListResponse)
def get_evidences(melon_id: int, db: Session = Depends(get_db)):
    service = MelonService(db)
    best, evidence_list = service.get_evidences(melon_id=melon_id)
    return EvidenceListResponse(best=best, list=evidence_list)

@router.post("/evidences/{evidence_id}/upvote")
def upvote_evidence(
    evidence_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    service = GuessService(db)
    return service.upvote_evidence(evidence_id=evidence_id, current_user_id=current_user.id)

@router.post("/evidences/{evidence_id}/downvote")
def downvote_evidence(
    evidence_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    service = GuessService(db)
    return service.downvote_evidence(evidence_id=evidence_id)

@router.get("/{melon_id}/report")
def get_melon_report(melon_id: int, db: Session = Depends(get_db)):
    service = MelonService(db)
    return service.get_melon_report(melon_id=melon_id)

@router.post("", response_model=MelonResponse)
def create_melon(
    melon_data: MelonCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    service = MelonService(db)
    return service.create_melon(
        title=melon_data.title,
        description=melon_data.description,
        category=melon_data.category,
        cover_image=melon_data.cover_image,
        creator_id=current_user.id
    )
