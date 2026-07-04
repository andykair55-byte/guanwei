"""
pytest 配置和 fixtures
使用 SQLite 内存数据库进行测试，提供测试数据库会话和公共测试数据
"""
import os
import sys
import pytest

os.environ["DEV_MODE"] = "true"
os.environ["SECRET_KEY"] = "test-secret-key-for-integration-tests"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import fastapi_limiter.depends

class MockRateLimiter:
    def __init__(self, *args, **kwargs):
        pass

    async def __call__(self):
        return None

fastapi_limiter.depends.RateLimiter = MockRateLimiter

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import Base, get_db
from main import app
from models import User, Melon, Guess, Evidence
from auth import get_password_hash


@pytest.fixture(scope="session")
def db_engine():
    """创建测试数据库引擎（会话级，所有测试共享）"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """创建测试数据库会话（函数级，每个测试独立）"""
    connection = db_engine.connect()
    transaction = connection.begin()
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestingSessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """创建 FastAPI TestClient，使用测试数据库"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """创建测试用户"""
    hashed_password = get_password_hash("test123456")
    user = User(
        username="testuser",
        nickname="测试用户",
        password_hash=hashed_password,
        avatar="https://picsum.photos/seed/testuser/80/80",
        points=100,
        rank="吃瓜群众",
        is_admin=False,
        total_guesses=0,
        correct_guesses=0,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_user2(db_session):
    """创建第二个测试用户"""
    hashed_password = get_password_hash("test123456")
    user = User(
        username="testuser2",
        nickname="测试用户2",
        password_hash=hashed_password,
        avatar="https://picsum.photos/seed/testuser2/80/80",
        points=100,
        rank="吃瓜群众",
        is_admin=False,
        total_guesses=0,
        correct_guesses=0,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """获取认证请求头"""
    response = client.post(
        "/api/v1/users/login",
        json={"username": "testuser", "password": "test123456"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_melon(db_session, test_user):
    """创建测试瓜（待求证状态）"""
    melon = Melon(
        title="测试瓜：某明星出轨事件",
        description="据爆料，某知名明星被拍到与神秘人士约会，疑似出轨。",
        cover_image="",
        category="娱乐",
        creator_id=test_user.id,
        result=None,
        status="pending",
        participant_count=0,
        true_count=0,
        false_count=0,
    )
    db_session.add(melon)
    db_session.commit()
    db_session.refresh(melon)
    return melon


@pytest.fixture
def revealed_melon(db_session, test_user):
    """创建已揭晓结果的瓜（结果为真）"""
    melon = Melon(
        title="已揭晓瓜：某公司上市",
        description="某科技公司正式宣布上市，股票代码XXX。",
        cover_image="",
        category="财经",
        creator_id=test_user.id,
        result=True,
        status="revealed",
        participant_count=100,
        true_count=60,
        false_count=40,
    )
    db_session.add(melon)
    db_session.commit()
    db_session.refresh(melon)
    return melon
