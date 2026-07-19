"""用户认证"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User
import os
import logging
import secrets
import pathlib

logger = logging.getLogger(__name__)

DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

if not DEV_MODE and not SECRET_KEY:
    raise RuntimeError(
        "生产环境必须配置 SECRET_KEY！\n"
        "当前检测到 SECRET_KEY 未设置或为空，这在生产环境中是不允许的。\n"
        "请设置 SECRET_KEY 环境变量，建议使用强随机密钥，例如：\n"
        "  openssl rand -hex 32\n"
        "  python -c \"import secrets; print(secrets.token_hex(32))\"\n"
        "如果您正在开发环境中运行，请设置 DEV_MODE=true 以使用默认密钥。"
    )

if DEV_MODE and not SECRET_KEY:
    # DEV_MODE 兜底：从持久化文件读取 SECRET_KEY，首次生成时写入文件，
    # 保证重启后 SECRET_KEY 稳定，避免旧 JWT 失效导致前端 401 风暴。
    _secret_key_file = pathlib.Path(__file__).resolve().parent / ".secret_key"
    if _secret_key_file.exists():
        file_key = _secret_key_file.read_text(encoding="utf-8").strip()
        if file_key:
            SECRET_KEY = file_key
            logger.info("DEV_MODE SECRET_KEY 来源：来自持久化文件")

    if not SECRET_KEY:
        SECRET_KEY = secrets.token_hex(32)
        try:
            _secret_key_file.write_text(SECRET_KEY, encoding="utf-8")
            try:
                _secret_key_file.chmod(0o600)
            except OSError:
                # Windows 文件系统不支持 Unix 权限位，忽略
                pass
            logger.info("DEV_MODE SECRET_KEY 来源：首次生成并写入文件")
        except OSError as e:
            # 持久化失败时回退到内存随机 key（重启后失效，但保证启动成功）
            logger.warning(f"DEV_MODE SECRET_KEY 持久化失败，使用临时 key：{e}")
elif SECRET_KEY:
    logger.info("SECRET_KEY 来源：来自环境变量")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    user = db.query(User).filter(User.id == int(user_id)).first()
    return user

def require_current_user(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录"
        )
    return current_user


def require_admin(
    current_user: User = Depends(require_current_user)
) -> User:
    """要求管理员权限"""
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user
