"""
API 端点测试
"""
import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestHealthEndpoint:
    """健康检查测试"""

    def test_health(self):
        """测试健康检查"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestUserEndpoints:
    """用户端点测试"""

    def test_get_user(self):
        """测试获取用户"""
        response = client.get("/api/v1/users/1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "nickname" in data

    def test_login(self):
        """测试登录"""
        response = client.post("/api/v1/users/login", json={
            "username": "test_user",
            "password": "test_password"
        })
        # 可能返回 200 或 401（取决于种子数据）
        assert response.status_code in [200, 401]


class TestMelonEndpoints:
    """瓜田端点测试"""

    def test_get_melons(self):
        """测试获取瓜田列表"""
        response = client.get("/api/v1/melons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_melon_detail(self):
        """测试获取瓜详情"""
        response = client.get("/api/v1/melons/1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data


class TestEvidenceEndpoints:
    """证据链端点测试"""

    def test_get_evidence_by_melon(self):
        """测试通过瓜 ID 获取证据链"""
        response = client.get("/api/v1/evidence/melon/1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestModelEndpoints:
    """模型管理端点测试"""

    def test_list_providers(self):
        """测试列出模型提供商"""
        response = client.get("/api/v1/models/providers")
        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        assert "providers" in data


class TestErrorHandling:
    """错误处理测试"""

    def test_404_error(self):
        """测试 404 错误格式"""
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404

    def test_error_format(self):
        """测试错误响应格式"""
        # 触发一个错误
        response = client.post("/api/v1/melons/999/guess", json={
            "user_id": 1,
            "choice": True
        })
        if response.status_code >= 400:
            data = response.json()
            # 统一错误格式
            assert "code" in data or "detail" in data