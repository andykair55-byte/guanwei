# backend/services/workspace/event_bus.py
"""工作间事件总线 — WebSocket 推送 + 事件缓存 + 懒检查 reaper 支持"""
import json
import logging
import math
import time
from collections import deque
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

EVENT_CACHE_SIZE = 100


class WorkspaceEventBus:
    """工作间 WebSocket 事件总线"""

    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}
        self.event_cache: Dict[str, deque] = {}
        self.last_event_ts: Dict[str, float] = {}  # 评审 #2：记录最近事件时间戳

    async def connect(self, websocket: WebSocket, workspace_id: str):
        """建立连接 + 回放缓存事件"""
        await websocket.accept()
        if workspace_id not in self.connections:
            self.connections[workspace_id] = set()
        self.connections[workspace_id].add(websocket)

        cache = self.event_cache.get(workspace_id, deque(maxlen=EVENT_CACHE_SIZE))
        for event in cache:
            try:
                await websocket.send_text(json.dumps(event, ensure_ascii=False, default=str))
            except Exception:
                break

        logger.info(f"[Workspace WS] 连接建立: {workspace_id}")

    async def disconnect(self, websocket: WebSocket, workspace_id: str):
        if workspace_id in self.connections:
            self.connections[workspace_id].discard(websocket)
            if not self.connections[workspace_id]:
                del self.connections[workspace_id]
        logger.info(f"[Workspace WS] 连接断开: {workspace_id}")

    async def emit(self, workspace_id: str, event: dict):
        """推送事件到所有连接 + 写入缓存 + 更新最近事件时间戳"""
        if workspace_id not in self.event_cache:
            self.event_cache[workspace_id] = deque(maxlen=EVENT_CACHE_SIZE)
        self.event_cache[workspace_id].append(event)
        self.last_event_ts[workspace_id] = time.time()  # 评审 #2

        if workspace_id not in self.connections:
            return

        message = json.dumps(event, ensure_ascii=False, default=str)
        disconnected = []
        for conn in list(self.connections[workspace_id]):
            try:
                await conn.send_text(message)
            except Exception as e:
                logger.error(f"[Workspace WS] 发送失败: {e}")
                disconnected.append(conn)
        for conn in disconnected:
            self.connections[workspace_id].discard(conn)

    async def handle_client_message(self, workspace_id: str, message: str):
        """处理客户端消息（第二版：用户介入用）"""
        logger.debug(f"[Workspace WS] 客户端消息 {workspace_id}: {message}")

    def clear_cache(self, workspace_id: str):
        """清理已完成 workspace 的事件缓存 + 时间戳"""
        self.event_cache.pop(workspace_id, None)
        self.last_event_ts.pop(workspace_id, None)  # 评审 #2

    def last_event_age_seconds(self, workspace_id: str) -> float:
        """评审 #2：返回最近一次事件距现在的秒数
        无事件返回 float('inf')，供懒检查 reaper 使用。
        """
        ts = self.last_event_ts.get(workspace_id)
        if ts is None:
            return math.inf
        return time.time() - ts


event_bus = WorkspaceEventBus()
