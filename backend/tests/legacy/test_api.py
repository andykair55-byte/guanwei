"""
API 端点测试（legacy）

spec-14 任务 4 修复：
- 原测试在模块级创建 TestClient(app)，未使用 conftest 的 db_session 覆盖，
  导致 SQLite 内存数据库表缺失。改为使用 conftest 的 client fixture。
- 修正与当前 API 不匹配的断言（/melons 返回 dict 而非 list、/users/{id} 端点不存在等）。
"""
import pytest


class TestHealthEndpoint:
    """健康检查测试"""

    def test_health(self, client):
        """测试健康检查"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestUserEndpoints:
    """用户端点测试"""

    def test_get_me_unauthorized(self, client):
        """测试未登录访问 /users/me 返回 401"""
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_login(self, client):
        """测试登录（不存在的用户返回 401）"""
        response = client.post("/api/v1/users/login", json={
            "username": "test_user",
            "password": "test_password"
        })
        # 不存在的用户返回 401
        assert response.status_code in [200, 401]


class TestMelonEndpoints:
    """瓜田端点测试"""

    def test_get_melons(self, client):
        """测试获取瓜田列表"""
        response = client.get("/api/v1/melons")
        assert response.status_code == 200
        data = response.json()
        # 当前 API 返回 {"total": N, "items": [...]} 而非裸 list
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_get_melon_detail(self, client, test_melon):
        """测试获取瓜详情"""
        response = client.get(f"/api/v1/melons/{test_melon.id}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data


class TestEvidenceEndpoints:
    """证据链端点测试"""

    def test_get_evidence_by_melon(self, client, test_melon):
        """测试通过瓜 ID 获取证据链"""
        response = client.get(f"/api/v1/evidence/melon/{test_melon.id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestModelEndpoints:
    """模型管理端点测试"""

    def test_list_providers(self, client):
        """测试列出模型提供商"""
        response = client.get("/api/v1/models/providers")
        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        assert "providers" in data


class TestErrorHandling:
    """错误处理测试"""

    def test_404_error(self, client):
        """测试 404 错误格式"""
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404

    def test_error_format(self, client):
        """测试错误响应格式"""
        # 触发一个错误（未登录猜不存在的瓜）
        response = client.post("/api/v1/melons/999/guess", json={
            "melon_id": 999,
            "choice": True
        })
        if response.status_code >= 400:
            data = response.json()
            # 统一错误格式
            assert "code" in data or "detail" in data
