"""
用户流程集成测试
测试用户从注册到签到的完整流程
"""
import pytest


class TestUserRegistrationFlow:
    """用户注册流程测试"""

    def test_register_success(self, client):
        """测试用户注册成功"""
        response = client.post(
            "/api/v1/users/register",
            json={
                "username": "newuser",
                "password": "test123456",
                "nickname": "新用户"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newuser"
        assert data["nickname"] == "新用户"
        assert "id" in data
        assert data["points"] == 100
        assert data["rank"] == "吃瓜群众"

    def test_register_initial_points_and_rank(self, client):
        """测试注册后初始积分100，段位'吃瓜群众'"""
        response = client.post(
            "/api/v1/users/register",
            json={
                "username": "pointstest",
                "password": "test123456",
                "nickname": "积分测试"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["points"] == 100
        assert data["rank"] == "吃瓜群众"
        assert data["total_guesses"] == 0
        assert data["correct_guesses"] == 0

    def test_register_duplicate_username(self, client):
        """测试重复注册返回400"""
        client.post(
            "/api/v1/users/register",
            json={
                "username": "duplicate",
                "password": "test123456",
                "nickname": "重复用户"
            }
        )
        response = client.post(
            "/api/v1/users/register",
            json={
                "username": "duplicate",
                "password": "test123456",
                "nickname": "重复用户2"
            }
        )
        assert response.status_code == 400


class TestUserLoginFlow:
    """用户登录流程测试"""

    def test_login_success(self, client, test_user):
        """测试用户登录成功，返回 JWT token"""
        response = client.post(
            "/api/v1/users/login",
            json={"username": "testuser", "password": "test123456"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "testuser"

    def test_login_wrong_password(self, client, test_user):
        """测试错误密码登录返回401"""
        response = client.post(
            "/api/v1/users/login",
            json={"username": "testuser", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        """测试不存在的用户登录返回401"""
        response = client.post(
            "/api/v1/users/login",
            json={"username": "nonexistent", "password": "test123456"}
        )
        assert response.status_code == 401


class TestUserDailyLoginFlow:
    """每日签到流程测试"""

    def test_daily_login_success(self, client, auth_headers, test_user):
        """测试每日签到成功，积分+10"""
        response = client.post(
            "/api/v1/users/me/daily-login",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["added"] == 10
        assert data["points"] == 110

    def test_daily_login_duplicate(self, client, auth_headers, test_user):
        """测试重复签到返回400"""
        client.post("/api/v1/users/me/daily-login", headers=auth_headers)
        response = client.post(
            "/api/v1/users/me/daily-login",
            headers=auth_headers
        )
        assert response.status_code == 400

    def test_daily_login_unauthorized(self, client):
        """测试未登录签到返回401"""
        response = client.post("/api/v1/users/me/daily-login")
        assert response.status_code == 401


class TestUserProfileFlow:
    """用户个人信息流程测试"""

    def test_get_me_success(self, client, auth_headers, test_user):
        """测试获取个人信息正确"""
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["nickname"] == "测试用户"
        assert data["points"] == 100
        assert data["rank"] == "吃瓜群众"

    def test_get_me_unauthorized(self, client):
        """测试未登录获取个人信息返回401"""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_get_points_records(self, client, auth_headers, test_user):
        """测试获取积分记录正确"""
        client.post("/api/v1/users/me/daily-login", headers=auth_headers)
        response = client.get("/api/v1/users/me/points", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_user_stats(self, client, auth_headers, test_user):
        """测试获取个人统计正确"""
        response = client.get("/api/v1/users/me/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "rank" in data
        assert "points" in data
        assert "total_guesses" in data
        assert "correct_guesses" in data
        assert "accuracy" in data
        assert data["total_guesses"] == 0
        assert data["correct_guesses"] == 0
        assert data["accuracy"] == 0


class TestCompleteUserFlow:
    """完整用户流程测试：注册→登录→签到→获取信息"""

    def test_complete_flow(self, client):
        """测试完整用户流程"""
        username = "flowtestuser"
        password = "flowtest123"
        nickname = "流程测试用户"

        register_resp = client.post(
            "/api/v1/users/register",
            json={
                "username": username,
                "password": password,
                "nickname": nickname
            }
        )
        assert register_resp.status_code == 200
        user_data = register_resp.json()
        assert user_data["points"] == 100
        assert user_data["rank"] == "吃瓜群众"

        login_resp = client.post(
            "/api/v1/users/login",
            json={"username": username, "password": password}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        login_resp2 = client.post(
            "/api/v1/users/login",
            json={"username": username, "password": "wrongpass"}
        )
        assert login_resp2.status_code == 401

        daily_resp = client.post(
            "/api/v1/users/me/daily-login",
            headers=headers
        )
        assert daily_resp.status_code == 200
        assert daily_resp.json()["added"] == 10

        daily_resp2 = client.post(
            "/api/v1/users/me/daily-login",
            headers=headers
        )
        assert daily_resp2.status_code == 400

        me_resp = client.get("/api/v1/users/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["points"] == 110

        stats_resp = client.get("/api/v1/users/me/stats", headers=headers)
        assert stats_resp.status_code == 200
        assert stats_resp.json()["points"] == 110

        points_resp = client.get("/api/v1/users/me/points", headers=headers)
        assert points_resp.status_code == 200
        points_data = points_resp.json()
        assert isinstance(points_data, list)
        assert len(points_data) >= 2
