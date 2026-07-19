"""用户相关 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse, PointsRecordResponse
from auth import require_current_user
from services.user_service import get_user_service, UserService
from services.cache import REDIS_AVAILABLE
from fastapi_limiter.depends import RateLimiter

router = APIRouter(prefix="/users", tags=["用户"])

# 条件限流：Redis 不可用时跳过
_login_deps = [Depends(RateLimiter(times=5, seconds=60))] if REDIS_AVAILABLE else []


@router.post("/register", response_model=UserResponse)
def register(
    user: UserCreate,
    user_service: UserService = Depends(get_user_service)
):
    return user_service.register(user.username, user.password, user.nickname)


@router.post("/login", dependencies=_login_deps)
def login(
    user: UserLogin,
    user_service: UserService = Depends(get_user_service)
):
    db_user, access_token = user_service.login(user.username, user.password)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(db_user)
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_current_user)):
    return current_user


@router.get("/me/stats")
def get_my_stats(
    current_user: User = Depends(require_current_user),
    user_service: UserService = Depends(get_user_service)
):
    return user_service.get_user_stats(current_user)


@router.get("/me/points", response_model=list[PointsRecordResponse])
def get_my_points(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_current_user),
    user_service: UserService = Depends(get_user_service)
):
    return user_service.get_points_records(current_user.id, skip, limit)


@router.post("/me/daily-login")
def daily_login(
    current_user: User = Depends(require_current_user),
    user_service: UserService = Depends(get_user_service)
):
    return user_service.daily_login(current_user.id)
