"""数据库配置"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jianwei.db")

is_sqlite = "sqlite" in SQLALCHEMY_DATABASE_URL
is_postgres = "postgresql" in SQLALCHEMY_DATABASE_URL

if not DEV_MODE and is_sqlite:
    raise RuntimeError(
        "生产环境必须使用 PostgreSQL 数据库！\n"
        "当前检测到 SQLite 配置，这在生产环境中是不允许的。\n"
        "请设置 DATABASE_URL 环境变量指向 PostgreSQL 数据库，例如：\n"
        "  DATABASE_URL=postgresql://user:password@localhost:5432/jianwei\n"
        "如果您正在开发环境中运行，请设置 DEV_MODE=true 以允许使用 SQLite。"
    )

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif is_postgres:
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 30,
        "pool_pre_ping": True,
        "pool_recycle": 1800,
    })

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

if DEV_MODE and is_sqlite:
    logger.warning(
        "【警告】当前处于开发模式 (DEV_MODE=true)，正在使用 SQLite 数据库。\n"
        "SQLite 仅适用于本地开发和测试，请勿在生产环境中使用。\n"
        "生产环境请配置 PostgreSQL 数据库。"
    )
elif is_postgres:
    logger.info(f"数据库连接已初始化：PostgreSQL，连接池大小={engine_kwargs.get('pool_size')}，max_overflow={engine_kwargs.get('max_overflow')}")
else:
    logger.info("数据库连接已初始化")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
