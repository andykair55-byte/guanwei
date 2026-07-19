"""熔断器（Circuit Breaker）— per provider per key 维度

状态机：
- CLOSED：正常放行；失败累计达 failure_threshold 转 OPEN
- OPEN：拒绝请求；经过 recovery_timeout 后转 HALF_OPEN
- HALF_OPEN：允许有限探测；探测成功转 CLOSED，失败回 OPEN

仅内存级（单实例），多实例部署需上 Redis。线程/协程安全由 asyncio.Lock 保证。
"""
import asyncio
import time
from dataclasses import dataclass
from enum import Enum


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class KeyCircuitState:
    """单个 key 的熔断状态"""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float = 0.0
    half_open_calls_in_flight: int = 0


class CircuitBreaker:
    """熔断器，按 key 维度隔离状态。

    Args:
        failure_threshold: 连续失败次数阈值，达到后熔断
        recovery_timeout: OPEN 状态持续时间（秒），过后进入 HALF_OPEN
        half_open_max_calls: HALF_OPEN 状态下允许并发的探测请求数
    """

    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_timeout: float = 60.0,
        half_open_max_calls: int = 1,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self._states: dict[str, KeyCircuitState] = {}
        self._lock = asyncio.Lock()

    def _get_state(self, key: str) -> KeyCircuitState:
        if key not in self._states:
            self._states[key] = KeyCircuitState()
        return self._states[key]

    async def can_call(self, key: str) -> bool:
        """是否允许对该 key 发起调用。HALF_OPEN 探测需配对调用 record_success/record_failure。"""
        async with self._lock:
            st = self._get_state(key)
            if st.state == CircuitState.CLOSED:
                return True
            if st.state == CircuitState.OPEN:
                # 到期则转 HALF_OPEN 并放行一次探测
                if time.time() - st.last_failure_time > self.recovery_timeout:
                    st.state = CircuitState.HALF_OPEN
                    st.half_open_calls_in_flight = 1
                    return True
                return False
            # HALF_OPEN：限制并发探测数
            if st.half_open_calls_in_flight < self.half_open_max_calls:
                st.half_open_calls_in_flight += 1
                return True
            return False

    async def record_success(self, key: str) -> None:
        """调用成功：重置为 CLOSED。"""
        async with self._lock:
            st = self._get_state(key)
            st.state = CircuitState.CLOSED
            st.failure_count = 0
            st.half_open_calls_in_flight = 0

    async def record_failure(self, key: str) -> None:
        """调用失败：累加失败计数，达阈值转 OPEN。"""
        async with self._lock:
            st = self._get_state(key)
            st.failure_count += 1
            st.last_failure_time = time.time()
            # 释放 HALF_OPEN 探测槽位
            if st.half_open_calls_in_flight > 0:
                st.half_open_calls_in_flight -= 1
            # HALF_OPEN 探测失败直接回 OPEN；CLOSED 达阈值转 OPEN
            if st.state == CircuitState.HALF_OPEN or st.failure_count >= self.failure_threshold:
                st.state = CircuitState.OPEN

    def get_status(self) -> dict:
        """返回所有 key 的状态快照（key 已脱敏，仅供监控端点查看）。"""
        status = {}
        for key, st in self._states.items():
            masked = (key[:8] + "...") if len(key) > 8 else "***"
            status[masked] = {
                "state": st.state.value,
                "failure_count": st.failure_count,
                "last_failure_time": st.last_failure_time,
                "half_open_calls_in_flight": st.half_open_calls_in_flight,
            }
        return status
