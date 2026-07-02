"""WebSocket 事件管理器 - 实时推送 Pipeline 状态流转"""
import json
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class PipelineWSManager:
    """Pipeline WebSocket 管理器"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, pipeline_id: str):
        """建立连接"""
        await websocket.accept()
        if pipeline_id not in self.active_connections:
            self.active_connections[pipeline_id] = set()
        self.active_connections[pipeline_id].add(websocket)
        logger.info(f"WebSocket 连接建立: {pipeline_id}")

    async def disconnect(self, websocket: WebSocket, pipeline_id: str):
        """断开连接"""
        if pipeline_id in self.active_connections:
            self.active_connections[pipeline_id].discard(websocket)
            if not self.active_connections[pipeline_id]:
                del self.active_connections[pipeline_id]
        logger.info(f"WebSocket 连接断开: {pipeline_id}")

    async def broadcast(self, pipeline_id: str, event: dict):
        """向指定 Pipeline 的所有连接广播事件"""
        if pipeline_id not in self.active_connections:
            return

        message = json.dumps(event)
        disconnected = []

        for connection in self.active_connections[pipeline_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"WebSocket 发送失败: {e}")
                disconnected.append(connection)

        for conn in disconnected:
            self.active_connections[pipeline_id].discard(conn)

        if not self.active_connections[pipeline_id]:
            del self.active_connections[pipeline_id]


ws_manager = PipelineWSManager()