"""用户相关 API"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

from database import get_db
from models import User, PointsRecord
from schemas import UserCreate, UserLogin, UserResponse, PointsRecordResponse
from auth import get_password_hash, verify_password, create_access_token, require_current_user
from ranks import calculate_rank

router = APIRouter(prefix="/users", tags=["用户"])

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        nickname=user.nickname,
        password_hash=hashed_password,
        avatar=f"https://picsum.photos/seed/{user.username}/80/80",
        points=100,
        rank="吃瓜群众"
    )
    db.add(db_user)
    db.flush()
    record = PointsRecord(
        user_id=db_user.id,
        amount=100,
        type="login",
        description="新用户注册奖励"
    )
    db.add(record)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(days=7)
    )
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.from_orm(db_user)}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_current_user)):
    return current_user

@router.get("/me/stats")
def get_my_stats(current_user: User = Depends(require_current_user)):
    accuracy = current_user.correct_guesses / current_user.total_guesses if current_user.total_guesses > 0 else 0
    return {
        "rank": current_user.rank,
        "points": current_user.points,
        "total_guesses": current_user.total_guesses,
        "correct_guesses": current_user.correct_guesses,
        "accuracy": round(accuracy, 4)
    }

@router.get("/me/points", response_model=list[PointsRecordResponse])
def get_my_points(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    records = db.query(PointsRecord)\
        .filter(PointsRecord.user_id == current_user.id)\
        .order_by(PointsRecord.created_at.desc())\
        .offset(skip).limit(limit).all()
    return records

@router.post("/me/daily-login")
def daily_login(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.utcnow().date()
    today_record = db.query(PointsRecord).filter(
        PointsRecord.user_id == current_user.id,
        PointsRecord.type == "login",
        PointsRecord.description == "每日签到"
    ).order_by(PointsRecord.created_at.desc()).first()
    
    if today_record and today_record.created_at.date() == today:
        raise HTTPException(status_code=400, detail="今日已签到")
    
    current_user.points += 10
    record = PointsRecord(
        user_id=current_user.id,
        amount=10,
        type="login",
        description="每日签到"
    )
    db.add(record)
    db.commit()
    return {"success": True, "points": current_user.points, "added": 10}
