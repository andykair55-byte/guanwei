"""数据库配置"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./jianwei.db")

# PostgreSQL 连接池配置
is_postgres = "postgresql" in SQLALCHEMY_DATABASE_URL

engine_kwargs = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif is_postgres:
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 15,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
