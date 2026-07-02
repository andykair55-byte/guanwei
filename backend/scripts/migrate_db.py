"""
数据迁移脚本：SQLite → PostgreSQL
用法：python backend/scripts/migrate_db.py
"""
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, User, Melon, Guess, Evidence, Report, EvidenceChain, PointsRecord

# SQLite 源数据库
SQLITE_URL = os.getenv("SOURCE_DATABASE_URL", "sqlite:///./jianwei.db")

# PostgreSQL 目标数据库
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://jianwei:jianwei_dev_password@localhost:5432/jianwei")


def migrate():
    """执行数据迁移"""
    print(f"源数据库: {SQLITE_URL}")
    print(f"目标数据库: {POSTGRES_URL}")

    # 源数据库连接
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # 目标数据库连接
    postgres_engine = create_engine(POSTGRES_URL)
    PostgresSession = sessionmaker(bind=postgres_engine)
    postgres_session = PostgresSession()

    # 创建目标数据库表结构
    print("\n创建 PostgreSQL 表结构...")
    Base.metadata.create_all(postgres_engine)

    # 迁移用户数据
    print("\n迁移用户数据...")
    users = sqlite_session.query(User).all()
    for user in users:
        postgres_session.merge(user)
    print(f"已迁移 {len(users)} 个用户")

    # 迁移瓜数据
    print("\n迁移瓜数据...")
    melons = sqlite_session.query(Melon).all()
    for melon in melons:
        postgres_session.merge(melon)
    print(f"已迁移 {len(melons)} 个瓜")

    # 迁移猜测数据
    print("\n迁移猜测数据...")
    guesses = sqlite_session.query(Guess).all()
    for guess in guesses:
        postgres_session.merge(guess)
    print(f"已迁移 {len(guesses)} 个猜测")

    # 迁移佐证数据
    print("\n迁移佐证数据...")
    evidences = sqlite_session.query(Evidence).all()
    for evidence in evidences:
        postgres_session.merge(evidence)
    print(f"已迁移 {len(evidences)} 条佐证")

    # 迁移报告数据
    print("\n迁移报告数据...")
    reports = sqlite_session.query(Report).all()
    for report in reports:
        postgres_session.merge(report)
    print(f"已迁移 {len(reports)} 个报告")

    # 迁移证据链数据（新表，SQLite 可能无数据）
    print("\n迁移证据链数据...")
    try:
        evidence_chains = sqlite_session.query(EvidenceChain).all()
        for ec in evidence_chains:
            postgres_session.merge(ec)
        print(f"已迁移 {len(evidence_chains)} 条证据链")
    except Exception as e:
        print(f"证据链表可能不存在于 SQLite: {e}")

    # 迁移积分记录
    print("\n迁移积分记录...")
    records = sqlite_session.query(PointsRecord).all()
    for record in records:
        postgres_session.merge(record)
    print(f"已迁移 {len(records)} 条积分记录")

    # 提交事务
    postgres_session.commit()
    print("\n迁移完成！")

    # 关闭连接
    sqlite_session.close()
    postgres_session.close()


if __name__ == "__main__":
    migrate()