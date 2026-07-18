"""LLM 矩阵故障转移测试 (spec-14 任务 1)

覆盖：
- KeyPool 轮询 / rpm 限流 / 可用 key 查询
- CircuitBreaker 状态机（CLOSED → OPEN → HALF_OPEN → CLOSED）
- LLMService 矩阵遍历：key 级故障转移、provider 级故障转移

不依赖真实 LLM API，使用 unittest.mock.AsyncMock mock AsyncOpenAI 客户端。
"""
import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock

import httpx
from openai import RateLimitError, APIConnectionError

from services.llm import KeyPool, LLMService, PROVIDERS
from services.circuit_breaker import CircuitBreaker, CircuitState


# ================================================================
#  Helpers
# ================================================================

def _make_rate_limit_error() -> RateLimitError:
    """构造一个 RateLimitError (HTTP 429) 用于测试"""
    req = httpx.Request("POST", "https://api.test.com/v1/chat/completions")
    resp = httpx.Response(status_code=429, request=req)
    return RateLimitError(message="rate limited", response=resp, body=None)


def _make_api_connection_error() -> APIConnectionError:
    """构造一个 APIConnectionError 用于测试"""
    req = httpx.Request("POST", "https://api.test.com/v1/chat/completions")
    return APIConnectionError(request=req)


def _make_mock_response(content: str = "hello"):
    """构造一个 mock 的 OpenAI chat completion response"""
    resp = MagicMock()
    resp.choices = [MagicMock()]
    resp.choices[0].message.content = content
    return resp


def _make_mock_client(side_effect=None, return_value=None):
    """构造一个 mock AsyncOpenAI 客户端

    Args:
        side_effect: 异常或异常列表，优先于 return_value
        return_value: 正常返回值
    """
    client = MagicMock()
    client.chat = MagicMock()
    client.chat.completions = MagicMock()
    if side_effect is not None:
        client.chat.completions.create = AsyncMock(side_effect=side_effect)
    else:
        client.chat.completions.create = AsyncMock(return_value=return_value or _make_mock_response())
    return client


# ================================================================
#  KeyPool 测试
# ================================================================

class TestKeyPool:
    """KeyPool 轮询与限流测试"""

    def test_key_pool_round_robin(self):
        """3 key 轮询：调用 3 次 next_key 各用 1 个 key，顺序循环"""
        pool = KeyPool(keys=["key-a", "key-b", "key-c"], rpm_limit=0)
        results = [pool.next_key() for _ in range(3)]
        assert results == ["key-a", "key-b", "key-c"]

    def test_key_pool_round_robin_wraps(self):
        """轮询到末尾后回到第一个 key"""
        pool = KeyPool(keys=["key-a", "key-b"], rpm_limit=0)
        results = [pool.next_key() for _ in range(4)]
        assert results == ["key-a", "key-b", "key-a", "key-b"]

    def test_key_pool_rpm_limit(self):
        """rpm=2 时，单 key 调用 2 次+record_call 后第 3 次 next_key 返回 None"""
        pool = KeyPool(keys=["limited-key"], rpm_limit=2)
        # 前 2 次可用
        k1 = pool.next_key()
        assert k1 == "limited-key"
        pool.record_call(k1)

        k2 = pool.next_key()
        assert k2 == "limited-key"
        pool.record_call(k2)

        # 第 3 次应该返回 None（达限）
        k3 = pool.next_key()
        assert k3 is None

    def test_key_pool_rpm_limit_skips_saturated(self):
        """多 key 时跳过满载 key，使用未满的 key"""
        pool = KeyPool(keys=["k1", "k2"], rpm_limit=1)
        # 用掉 k1 的配额
        first = pool.next_key()
        assert first == "k1"
        pool.record_call("k1")
        # k1 满了，应该返回 k2
        second = pool.next_key()
        assert second == "k2"

    def test_key_pool_available_keys(self):
        """达限的 key 不在 available_keys 中"""
        pool = KeyPool(keys=["a", "b"], rpm_limit=1)
        pool.record_call("a")  # a 达限
        available = pool.available_keys()
        assert "a" not in available
        assert "b" in available

    def test_key_pool_empty_keys(self):
        """空 key 列表，next_key 返回 None"""
        pool = KeyPool(keys=[], rpm_limit=0)
        assert pool.next_key() is None
        assert pool.available_keys() == []


# ================================================================
#  CircuitBreaker 测试
# ================================================================

class TestCircuitBreaker:
    """CircuitBreaker 状态机测试"""

    @pytest.mark.asyncio
    async def test_circuit_breaker_open_after_threshold(self):
        """3 次失败后状态为 OPEN，can_call 返回 False"""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        key = "test-key"
        # 初始 CLOSED，允许调用
        assert await cb.can_call(key) is True

        # 2 次失败（未达阈值，仍 CLOSED）
        await cb.record_failure(key)
        await cb.record_failure(key)
        assert await cb.can_call(key) is True

        # 第 3 次失败 → OPEN
        await cb.record_failure(key)
        # OPEN 状态下 can_call 返回 False
        assert await cb.can_call(key) is False

    @pytest.mark.asyncio
    async def test_circuit_breaker_half_open_recovery(self):
        """recovery_timeout 后转 HALF_OPEN，允许一次探测"""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        key = "test-key"

        # 触发 OPEN
        await cb.record_failure(key)
        await cb.record_failure(key)
        assert await cb.can_call(key) is False

        # 等待 recovery_timeout
        await asyncio.sleep(0.15)

        # 应转为 HALF_OPEN 并允许一次探测
        assert await cb.can_call(key) is True

    @pytest.mark.asyncio
    async def test_circuit_breaker_record_success_resets(self):
        """成功后重置为 CLOSED，failure_count 归零"""
        cb = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        key = "test-key"

        # 累积 2 次失败
        await cb.record_failure(key)
        await cb.record_failure(key)

        # 成功 → 重置
        await cb.record_success(key)

        # 验证状态重置：can_call 返回 True，且失败计数归零
        assert await cb.can_call(key) is True
        st = cb._get_state(key)
        assert st.state == CircuitState.CLOSED
        assert st.failure_count == 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_half_open_failure_reopens(self):
        """HALF_OPEN 探测失败回到 OPEN"""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        key = "test-key"

        # 触发 OPEN
        await cb.record_failure(key)
        await cb.record_failure(key)

        # 等待恢复 → HALF_OPEN
        await asyncio.sleep(0.15)
        assert await cb.can_call(key) is True  # HALF_OPEN 探测

        # 探测失败 → 回到 OPEN
        await cb.record_failure(key)
        assert await cb.can_call(key) is False

    @pytest.mark.asyncio
    async def test_circuit_breaker_per_key_isolation(self):
        """不同 key 的熔断状态相互隔离"""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=60)
        key_a, key_b = "key-a", "key-b"

        # key_a 熔断
        await cb.record_failure(key_a)
        await cb.record_failure(key_a)
        assert await cb.can_call(key_a) is False

        # key_b 不受影响
        assert await cb.can_call(key_b) is True


# ================================================================
#  LLMService 矩阵遍历测试
# ================================================================

class TestLLMMatrixFailover:
    """LLMService provider × key 矩阵遍历故障转移测试"""

    @pytest.mark.asyncio
    async def test_matrix_failover_to_next_key(self, monkeypatch):
        """第一个 key 抛 429，自动切换到第二个 key 并成功"""
        monkeypatch.setenv("DEEPSEEK_API_KEY", "key1,key2")
        monkeypatch.setenv("DEEPSEEK_API_KEY_RPM", "0")
        # 单次失败即熔断，便于验证 key 级故障转移
        monkeypatch.setenv("LLM_CIRCUIT_FAILURE_THRESHOLD", "1")

        service = LLMService(primary_provider="deepseek")

        # key1 抛 429，key2 成功
        client_map = {
            "key1": _make_mock_client(side_effect=_make_rate_limit_error()),
            "key2": _make_mock_client(return_value=_make_mock_response("fallback ok")),
        }
        service._get_client = lambda provider, key: client_map[key]

        response, used_key = await service._call_with_matrix(
            "deepseek",
            model="deepseek-chat",
            messages=[{"role": "user", "content": "hi"}],
            temperature=0.7,
            max_tokens=10,
        )

        assert used_key == "key2"
        assert response.choices[0].message.content == "fallback ok"
        # key1 应该被熔断（429 → record_failure）
        cb = service._get_circuit_breaker("deepseek")
        st = cb._get_state("key1")
        assert st.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_matrix_failover_to_next_provider(self, monkeypatch):
        """主 provider 全部 key 失败，切到 fallback provider 成功

        LLM 路由改造后（spec 2026-07-17-llm-module-routing），provider 级故障转移
        由 module 路由链提供。default 链为 ["glm","internlm","deepseek"]。
        本测试 mock glm 全 key 失败，验证切到 internlm 成功。
        """
        monkeypatch.setenv("GLM_API_KEY", "glm-key")
        monkeypatch.setenv("INTERNLM_API_KEY", "ilm-key")
        # 单次失败即熔断，便于验证 provider 级故障转移
        monkeypatch.setenv("LLM_CIRCUIT_FAILURE_THRESHOLD", "1")
        # 关闭 daily budget 限制避免干扰
        monkeypatch.delenv("DAILY_TOKEN_BUDGET_GLM", raising=False)
        monkeypatch.delenv("DAILY_TOKEN_BUDGET_INTERNLM", raising=False)

        service = LLMService(primary_provider="glm")

        # glm 的 client 抛 429，internlm 的 client 成功
        def fake_get_client(provider, key):
            if provider == "glm":
                return _make_mock_client(side_effect=_make_rate_limit_error())
            return _make_mock_client(return_value=_make_mock_response("internlm fallback"))

        service._get_client = fake_get_client

        # 不传 provider，走 default module 路由链
        result = await service.generate("hello")

        assert result == "internlm fallback"
        # glm 的 key 应被熔断
        cb = service._get_circuit_breaker("glm")
        st = cb._get_state("glm-key")
        assert st.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_matrix_all_keys_fail_raises_runtime_error(self, monkeypatch):
        """所有 key 都失败，抛出 RuntimeError"""
        monkeypatch.setenv("DEEPSEEK_API_KEY", "k1,k2")
        monkeypatch.setenv("DEEPSEEK_API_KEY_RPM", "0")

        service = LLMService(primary_provider="deepseek")
        service._get_client = lambda provider, key: _make_mock_client(
            side_effect=_make_rate_limit_error()
        )

        with pytest.raises(RuntimeError, match="所有 key 调用失败"):
            await service._call_with_matrix(
                "deepseek",
                model="m",
                messages=[{"role": "user", "content": "hi"}],
            )

    @pytest.mark.asyncio
    async def test_matrix_all_keys_circuit_open_raises_value_error(self, monkeypatch):
        """所有 key 都熔断，抛出 ValueError（无可用 key）"""
        monkeypatch.setenv("DEEPSEEK_API_KEY", "k1")
        monkeypatch.setenv("DEEPSEEK_API_KEY_RPM", "0")

        service = LLMService(primary_provider="deepseek")
        cb = service._get_circuit_breaker("deepseek")

        # 预先熔断 k1（3 次失败）
        await cb.record_failure("k1")
        await cb.record_failure("k1")
        await cb.record_failure("k1")

        with pytest.raises(ValueError, match="没有可用 key"):
            await service._call_with_matrix(
                "deepseek",
                model="m",
                messages=[{"role": "user", "content": "hi"}],
            )

    @pytest.mark.asyncio
    async def test_matrix_success_resets_circuit(self, monkeypatch):
        """调用成功后重置该 key 的熔断状态"""
        monkeypatch.setenv("DEEPSEEK_API_KEY", "k1")
        monkeypatch.setenv("DEEPSEEK_API_KEY_RPM", "0")

        service = LLMService(primary_provider="deepseek")
        cb = service._get_circuit_breaker("deepseek")

        # 预先累积 1 次失败（未熔断）
        await cb.record_failure("k1")

        service._get_client = lambda provider, key: _make_mock_client(
            return_value=_make_mock_response("ok")
        )

        await service._call_with_matrix(
            "deepseek",
            model="m",
            messages=[{"role": "user", "content": "hi"}],
        )

        st = cb._get_state("k1")
        assert st.state == CircuitState.CLOSED
        assert st.failure_count == 0

    @pytest.mark.asyncio
    async def test_matrix_api_connection_error_triggers_failover(self, monkeypatch):
        """网络错误（APIConnectionError）也触发 key 级故障转移"""
        monkeypatch.setenv("DEEPSEEK_API_KEY", "bad-key,good-key")
        monkeypatch.setenv("DEEPSEEK_API_KEY_RPM", "0")

        service = LLMService(primary_provider="deepseek")

        client_map = {
            "bad-key": _make_mock_client(side_effect=_make_api_connection_error()),
            "good-key": _make_mock_client(return_value=_make_mock_response("recovered")),
        }
        service._get_client = lambda provider, key: client_map[key]

        response, used_key = await service._call_with_matrix(
            "deepseek",
            model="m",
            messages=[{"role": "user", "content": "hi"}],
        )

        assert used_key == "good-key"
        assert response.choices[0].message.content == "recovered"
