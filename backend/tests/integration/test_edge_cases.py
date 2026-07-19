"""边界场景集成测试 (spec-14 任务 3)

覆盖关键边界场景：
- 重复猜瓜（同一瓜重复提交返回 400）
- 已开奖瓜猜瓜（直接结算 is_correct）
- 积分边界（管理员调整积分至负数）
- 并发猜瓜（同一用户连续提交，第二次 400）
- 瓜不存在（404）
- 未授权访问（401）
- 管理员权限（403）

使用 FastAPI TestClient + db_session fixture 进行集成测试。
"""
import pytest

from models import User
from auth import get_password_hash


@pytest.fixture
def admin_user(db_session):
    """创建管理员用户"""
    hashed_password = get_password_hash("admin123456")
    user = User(
        username="adminuser",
        nickname="管理员",
        password_hash=hashed_password,
        avatar="https://picsum.photos/seed/adminuser/80/80",
        points=1000,
        rank="吃瓜群众",
        is_admin=True,
        total_guesses=0,
        correct_guesses=0,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_auth_headers(client, admin_user):
    """获取管理员认证请求头"""
    response = client.post(
        "/api/v1/users/login",
        json={"username": "adminuser", "password": "admin123456"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestDuplicateGuess:
    """重复猜瓜测试"""

    def test_duplicate_guess(self, client, auth_headers, test_melon):
        """同一用户对同一瓜重复猜瓜，第二次返回 400"""
        # 第一次猜瓜成功
        resp1 = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={"melon_id": test_melon.id, "choice": True}
        )
        assert resp1.status_code == 200

        # 第二次重复猜瓜返回 400
        resp2 = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={"melon_id": test_melon.id, "choice": False}
        )
        assert resp2.status_code == 400
        assert "已经猜过" in resp2.json()["message"]


class TestGuessAfterReveal:
    """已开奖瓜猜瓜测试"""

    def test_guess_after_reveal(self, client, auth_headers, revealed_melon):
        """已开奖瓜猜瓜直接结算，is_correct 正确设置"""
        # revealed_melon.result = True，猜 True 应正确
        resp = client.post(
            f"/api/v1/melons/{revealed_melon.id}/guess",
            headers=auth_headers,
            json={"melon_id": revealed_melon.id, "choice": True}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_correct"] is True
        assert data["points_earned"] == 30


class TestInsufficientPoints:
    """积分边界测试"""

    def test_insufficient_points(self, client, admin_auth_headers, test_user):
        """管理员将用户积分调整为负数，系统允许此操作（边界场景）

        当前实现未对积分下限做校验，允许积分变为负数。
        此测试验证该边界行为，为后续积分消耗功能提供安全网。
        """
        # test_user 初始积分 100，调整为 -50
        resp = client.put(
            f"/api/v1/admin/users/{test_user.id}/points",
            headers=admin_auth_headers,
            json={"amount": -150, "reason": "测试积分边界"}
        )
        assert resp.status_code == 200
        assert resp.json()["points"] == -50  # 100 - 150 = -50


class TestConcurrentGuess:
    """并发猜瓜测试"""

    def test_concurrent_guess(self, client, auth_headers, test_melon):
        """同一用户连续快速提交两次猜瓜，第二次返回 400（防重复）

        TestClient 同步执行无法真正并发，但可验证防重复逻辑的健壮性：
        即使在极短时间间隔内重复提交，系统也应正确识别并拒绝。
        """
        # 第一次提交成功
        resp1 = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={"melon_id": test_melon.id, "choice": True}
        )
        assert resp1.status_code == 200

        # 立即再次提交（模拟并发场景下的重复提交）
        resp2 = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            headers=auth_headers,
            json={"melon_id": test_melon.id, "choice": True}
        )
        assert resp2.status_code == 400


class TestMelonNotFound:
    """瓜不存在测试"""

    def test_melon_not_found(self, client, auth_headers):
        """访问不存在的瓜返回 404"""
        # 猜不存在的瓜
        resp = client.post(
            "/api/v1/melons/99999/guess",
            headers=auth_headers,
            json={"melon_id": 99999, "choice": True}
        )
        assert resp.status_code == 404
        assert "不存在" in resp.json()["message"]

        # 获取不存在的瓜详情
        resp2 = client.get("/api/v1/melons/99999")
        assert resp2.status_code == 404


class TestUnauthorizedAccess:
    """未授权访问测试"""

    def test_unauthorized_access(self, client, test_melon):
        """未登录访问需要认证的端点返回 401"""
        # 猜瓜需要登录
        resp = client.post(
            f"/api/v1/melons/{test_melon.id}/guess",
            json={"melon_id": test_melon.id, "choice": True}
        )
        assert resp.status_code == 401

        # 创建瓜需要登录
        resp2 = client.post(
            "/api/v1/melons",
            json={"title": "test", "description": "test", "category": "娱乐"}
        )
        assert resp2.status_code == 401

        # 签到需要登录
        resp3 = client.post("/api/v1/users/me/daily-login")
        assert resp3.status_code == 401


class TestAdminAccessRequired:
    """管理员权限测试"""

    def test_admin_access_required(self, client, auth_headers):
        """非管理员用户访问管理端点返回 403"""
        # 普通用户访问管理后台用户列表
        resp = client.get("/api/v1/admin/users", headers=auth_headers)
        assert resp.status_code == 403

        # 普通用户尝试调整积分
        resp2 = client.put(
            "/api/v1/admin/users/1/points",
            headers=auth_headers,
            json={"amount": 10, "reason": "test"}
        )
        assert resp2.status_code == 403
