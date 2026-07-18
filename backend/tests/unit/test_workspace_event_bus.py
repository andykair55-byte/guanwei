# backend/tests/unit/test_workspace_event_bus.py
"""WorkspaceEventBus 测试"""
import pytest
from services.workspace.event_bus import WorkspaceEventBus


class MockWebSocket:
    def __init__(self):
        self.sent = []
        self.closed = False

    async def accept(self):
        pass

    async def send_text(self, msg):
        self.sent.append(msg)

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_connect_and_emit():
    """连接 + 推送事件"""
    bus = WorkspaceEventBus()
    ws = MockWebSocket()
    await bus.connect(ws, "ws-1")

    await bus.emit("ws-1", {"type": "agent_started", "agentType": "search"})

    assert len(ws.sent) == 1
    import json
    event = json.loads(ws.sent[0])
    assert event["type"] == "agent_started"


@pytest.mark.asyncio
async def test_event_cache_replay():
    """新连接回放缓存事件"""
    bus = WorkspaceEventBus()
    await bus.emit("ws-1", {"type": "event1"})
    await bus.emit("ws-1", {"type": "event2"})

    ws = MockWebSocket()
    await bus.connect(ws, "ws-1")

    assert len(ws.sent) == 2  # 回放 2 条


@pytest.mark.asyncio
async def test_disconnect():
    """断开连接"""
    bus = WorkspaceEventBus()
    ws = MockWebSocket()
    await bus.connect(ws, "ws-1")
    await bus.disconnect(ws, "ws-1")

    await bus.emit("ws-1", {"type": "after_disconnect"})
    assert len(ws.sent) == 0  # 断开后不再推送


@pytest.mark.asyncio
async def test_clear_cache():
    """清理缓存"""
    bus = WorkspaceEventBus()
    await bus.emit("ws-1", {"type": "event1"})
    bus.clear_cache("ws-1")

    ws = MockWebSocket()
    await bus.connect(ws, "ws-1")
    assert len(ws.sent) == 0  # 缓存已清


# 评审 #2：懒检查 reaper 依赖 last_event_age_seconds
def test_last_event_age_seconds_no_events():
    """无事件返回 inf"""
    import math
    bus = WorkspaceEventBus()
    age = bus.last_event_age_seconds("ws-empty")
    assert math.isinf(age)


@pytest.mark.asyncio
async def test_last_event_age_seconds_with_events():
    """有事件返回非负秒数"""
    import time
    bus = WorkspaceEventBus()
    await bus.emit("ws-1", {"type": "event1"})
    time.sleep(0.05)
    age = bus.last_event_age_seconds("ws-1")
    assert age >= 0.05
    assert age < 5  # 容忍上限


@pytest.mark.asyncio
async def test_last_event_age_seconds_after_clear():
    """清理后返回 inf"""
    import math
    bus = WorkspaceEventBus()
    await bus.emit("ws-1", {"type": "event1"})
    bus.clear_cache("ws-1")
    age = bus.last_event_age_seconds("ws-1")
    assert math.isinf(age)
