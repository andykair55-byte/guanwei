"""
用户业务服务层
负责用户注册、登录、统计、积分、签到等业务逻辑
"""
from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends

from database import get_db
from models import User, PointsRecord
from auth import get_password_hash, verify_password, create_access_token


class UserService:
    """用户服务"""

    def __init__(self, db: Session):
        self.db = db

    def register(self, username: str, password: str, nickname: str) -> User:
        """用户注册"""
        db_user = self.db.query(User).filter(User.username == username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="用户名已存在")
        hashed_password = get_password_hash(password)
        db_user = User(
            username=username,
            nickname=nickname,
            password_hash=hashed_password,
            avatar=f"https://picsum.photos/seed/{username}/80/80",
            points=100,
            rank="吃瓜群众"
        )
        self.db.add(db_user)
        self.db.flush()
        record = PointsRecord(
            user_id=db_user.id,
            amount=100,
            type="login",
            description="新用户注册奖励"
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def login(self, username: str, password: str) -> tuple[User, str]:
        """用户登录，返回 (用户, token)"""
        db_user = self.db.query(User).filter(User.username == username).first()
        if not db_user or not verify_password(password, db_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
        access_token = create_access_token(
            data={"sub": str(db_user.id)},
            expires_delta=timedelta(days=7)
        )
        return db_user, access_token

    def get_user_stats(self, user: User) -> dict:
        """获取用户统计信息"""
        accuracy = user.correct_guesses / user.total_guesses if user.total_guesses > 0 else 0
        return {
            "rank": user.rank,
            "points": user.points,
            "total_guesses": user.total_guesses,
            "correct_guesses": user.correct_guesses,
            "accuracy": round(accuracy, 4)
        }

    def get_points_records(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> list[PointsRecord]:
        """获取积分记录"""
        records = self.db.query(PointsRecord)\
            .filter(PointsRecord.user_id == user_id)\
            .order_by(PointsRecord.created_at.desc())\
            .offset(skip).limit(limit).all()
        return records

    def daily_login(self, user_id: int) -> dict:
        """每日签到"""
        today = datetime.utcnow().date()
        today_record = self.db.query(PointsRecord).filter(
            PointsRecord.user_id == user_id,
            PointsRecord.type == "login",
            PointsRecord.description == "每日签到"
        ).order_by(PointsRecord.created_at.desc()).first()

        if today_record and today_record.created_at.date() == today:
            raise HTTPException(status_code=400, detail="今日已签到")

        user = self.db.query(User).filter(User.id == user_id).first()
        user.points += 10
        self._add_points(
            user_id=user_id,
            amount=10,
            record_type="login",
            description="每日签到"
        )
        self.db.commit()
        return {"success": True, "points": user.points, "added": 10}

    def _add_points(
        self,
        user_id: int,
        amount: int,
        record_type: str,
        description: str
    ) -> None:
        """增加用户积分并创建记录"""
        record = PointsRecord(
            user_id=user_id,
            amount=amount,
            type=record_type,
            description=description
        )
        self.db.add(record)


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """获取用户服务实例"""
    return UserService(db)
