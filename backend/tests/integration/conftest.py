"""集成测试专用 fixtures.

背景：``_run_workspace_background`` 通过 ``SessionLocal()`` 新建 DB 会话，
而 ``SessionLocal`` 默认绑定 ``database.engine``（独立 in-memory SQLite）。
测试的 ``db_session`` fixture 绑定的是 ``tests/conftest.py`` 里的 ``db_engine``
（另一个 in-memory SQLite），两者数据互不可见，导致后台任务查不到测试创建的
工作间，状态永远停留在 ``running``。

此 conftest 把 ``api.workspace_routes.SessionLocal`` 替换为绑定到 ``db_session``
底层 connection 的 sessionmaker，让后台任务与测试共享同一 DB 连接。
"""
import pytest
from sqlalchemy.orm import sessionmaker


@pytest.fixture(autouse=True)
def patch_session_local(db_session):
    """让后台任务 SessionLocal() 与 db_session 共享同一 DB 连接."""
    from api import workspace_routes

    bind = db_session.get_bind()
    test_session_local = sessionmaker(autocommit=False, autoflush=False, bind=bind)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(workspace_routes, "SessionLocal", test_session_local)
        yield
