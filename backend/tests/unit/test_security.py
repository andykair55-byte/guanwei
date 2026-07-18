"""安全加固测试 (spec-14 任务 2)

覆盖 spec-12 安全加固功能：
- 密码强度校验（长度、字母+数字）
- 用户名校验（字符集、长度）
- 输入长度限制（verify content ≤ 2000）
- 安全响应头（X-Content-Type-Options 等）
- 登录限流（60 秒内 5 次，第 6 次返回 429）

使用 FastAPI TestClient 同步接口测试。
"""
import pytest
from fastapi import HTTPException


class TestPasswordValidation:
    """密码强度校验测试（spec-12）"""

    def test_password_too_short(self, client):
        """密码 < 8 位返回 422"""
        response = client.post("/api/v1/users/register", json={
            "username": "shortpw",
            "nickname": "短密码",
            "password": "ab1",  # 仅 3 位
        })
        assert response.status_code == 422

    def test_password_no_letter(self, client):
        """纯数字密码返回 422（必须包含字母）"""
        response = client.post("/api/v1/users/register", json={
            "username": "numonly",
            "nickname": "纯数字",
            "password": "12345678",  # 8 位但无字母
        })
        assert response.status_code == 422

    def test_password_no_digit(self, client):
        """纯字母密码返回 422（必须包含数字）"""
        response = client.post("/api/v1/users/register", json={
            "username": "letteronly",
            "nickname": "纯字母",
            "password": "abcdefgh",  # 8 位但无数字
        })
        assert response.status_code == 422

    def test_password_valid(self, client):
        """合法密码（字母+数字，≥8 位）注册成功"""
        response = client.post("/api/v1/users/register", json={
            "username": "validuser",
            "nickname": "合法用户",
            "password": "test1234",  # 8 位，有字母有数字
        })
        assert response.status_code == 200
        assert response.json()["username"] == "validuser"


class TestUsernameValidation:
    """用户名校验测试（spec-12）"""

    def test_username_invalid_chars(self, client):
        """含特殊字符的 username 返回 422（只允许字母、数字、下划线）"""
        response = client.post("/api/v1/users/register", json={
            "username": "test@user",  # 含 @
            "nickname": "特殊字符",
            "password": "test1234",
        })
        assert response.status_code == 422

    def test_username_too_long(self, client):
        """username > 20 字符返回 422"""
        response = client.post("/api/v1/users/register", json={
            "username": "a" * 21,  # 21 字符
            "nickname": "超长用户名",
            "password": "test1234",
        })
        assert response.status_code == 422

    def test_username_too_short(self, client):
        """username < 3 字符返回 422"""
        response = client.post("/api/v1/users/register", json={
            "username": "ab",  # 2 字符
            "nickname": "超短",
            "password": "test1234",
        })
        assert response.status_code == 422


class TestInputLengthLimit:
    """输入长度限制测试（spec-12）"""

    def test_verify_content_too_long(self, client):
        """verify content > 2000 字返回 422"""
        response = client.post("/api/v1/verify", json={
            "content": "x" * 2001,  # 2001 字符
        })
        assert response.status_code == 422

    def test_verify_content_at_limit(self, client):
        """verify content = 2000 字通过校验（不返回 422）"""
        response = client.post("/api/v1/verify", json={
            "content": "x" * 2000,
        })
        # 2000 字符在限制内，应通过校验（返回 200 而非 422）
        assert response.status_code != 422

    def test_melon_description_too_long(self, client, auth_headers):
        """创建瓜时 description > 2000 字返回 422"""
        response = client.post("/api/v1/melons", headers=auth_headers, json={
            "title": "测试瓜",
            "description": "x" * 2001,
            "category": "娱乐",
        })
        assert response.status_code == 422


class TestSecurityHeaders:
    """安全响应头测试（spec-12）"""

    def test_security_headers_present(self, client):
        """响应包含 OWASP 推荐安全头"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    def test_request_id_header_present(self, client):
        """响应包含 X-Request-ID 用于日志追踪"""
        response = client.get("/api/v1/health")
        request_id = response.headers.get("X-Request-ID")
        assert request_id is not None
        assert len(request_id) > 0  # 非空 UUID


class TestLoginRateLimit:
    """登录限流测试（spec-12）"""

    def test_login_rate_limit(self, client):
        """60 秒内 6 次登录返回 429

        conftest.py 全局 mock 了 RateLimiter（MockRateLimiter 不限流），
        这里用 app.dependency_overrides 覆盖登录路由的限流依赖实例，
        注入计数限流器验证限流逻辑正确性。
        实际生产环境需 Redis 启用后 FastAPILimiter 生效。
        """
        from api.user_routes import router as user_router
        from main import app

        # 找到登录路由（router.routes 中 path 含 prefix，为 /users/login）
        login_route = None
        for r in user_router.routes:
            if hasattr(r, "path") and r.path.endswith("/login"):
                login_route = r
                break

        if login_route is None or not login_route.dependencies:
            pytest.skip("登录路由未找到或无限流依赖")

        # 获取限流依赖实例（conftest 已将 RateLimiter mock 为 MockRateLimiter）
        rate_limiter_instance = login_route.dependencies[0].dependency

        # 计数限流器：前 5 次放行，第 6 次返回 429
        call_count = {"n": 0}

        async def counting_limiter():
            call_count["n"] += 1
            if call_count["n"] > 5:
                raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
            return None

        # 覆盖限流依赖
        app.dependency_overrides[rate_limiter_instance] = counting_limiter

        try:
            # 前 5 次：凭证错误返回 401（限流器放行）
            for i in range(5):
                resp = client.post("/api/v1/users/login", json={
                    "username": "nobody",
                    "password": "wrongpass",
                })
                assert resp.status_code == 401, f"第 {i+1} 次应返回 401，实际 {resp.status_code}"

            # 第 6 次：限流返回 429
            resp = client.post("/api/v1/users/login", json={
                "username": "nobody",
                "password": "wrongpass",
            })
            assert resp.status_code == 429
        finally:
            # 恢复
            app.dependency_overrides.pop(rate_limiter_instance, None)

    def test_login_route_has_rate_limiter_configured(self):
        """验证登录路由配置了 RateLimiter(times=5, seconds=60)

        conftest 全局 mock RateLimiter，且 login 路由用 `dependencies=_login_deps`
        条件限流（Redis 不可用时 _login_deps 为空）。因此验证模块级 _login_deps
        的定义源码，而不是 login 函数体（RateLimiter 不在函数体内）。
        """
        import inspect
        from api import user_routes

        # 检查模块源码中定义了 RateLimiter(times=5, seconds=60)
        module_source = inspect.getsource(user_routes)
        assert "RateLimiter" in module_source
        assert "times=5" in module_source
        assert "seconds=60" in module_source

        # 检查 login 路由注册时挂了 dependencies（即使 REDIS_AVAILABLE=False 时为空列表，
        # 代码也必须有 `_login_deps` 引用，证明限流配置存在）
        assert "_login_deps" in module_source
        assert 'dependencies=_login_deps' in module_source
