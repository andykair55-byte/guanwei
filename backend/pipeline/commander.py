"""Commander - 容错内核核心控制器

负责：
1. 异常拦截与检测
2. 状态回滚到干净 Checkpoint
3. Agent 热替换（从备用池切换）
4. 断点续传与事件广播
"""
import uuid
import time
import logging
from typing import Callable, Any, Optional
from functools import wraps

from pipeline.schemas import (
    PipelineState,
    PipelineEvent,
    Checkpoint,
    AgentConfig,
)
from services.llm import llm_service, PROVIDERS

logger = logging.getLogger(__name__)


class FaultHotSwappingError(Exception):
    """热替换异常"""
    pass


class Commander:
    """容错指挥官 - 核心容错控制器"""

    MAX_RETRY_ATTEMPTS = 3
    MAX_SWITCH_ATTEMPTS = 2
    RECOVERY_COOLDOWN = 60

    def __init__(self):
        self._event_callbacks = []
        self._init_agent_pool()

    def _init_agent_pool(self) -> dict:
        """初始化 Agent 池配置"""
        primary_provider = llm_service.primary_provider
        backup_providers = llm_service.fallback_providers

        primary_config = AgentConfig(
            provider=primary_provider,
            model=llm_service.get_model_name(primary_provider),
            temperature=0.7,
            max_tokens=4096,
            timeout=60,
        )

        backup_configs = []
        for prov in backup_providers[:3]:
            try:
                backup_configs.append(AgentConfig(
                    provider=prov,
                    model=llm_service.get_model_name(prov),
                    temperature=0.7,
                    max_tokens=4096,
                    timeout=60,
                ))
            except Exception:
                continue

        return {
            "primary": primary_config,
            "backup": backup_configs,
            "current_provider": primary_provider,
            "fail_count": 0,
            "last_switch_time": None,
        }

    def register_event_callback(self, callback: Callable[[PipelineEvent], None]):
        """注册事件回调（用于 WebSocket 推送）"""
        self._event_callbacks.append(callback)

    def _emit_event(self, state: PipelineState, event_type: str, node_name: str, message: str, details: dict = None):
        """发布事件"""
        event = PipelineEvent(
            event_id=str(uuid.uuid4()),
            type=event_type,
            timestamp=time.time(),
            node_name=node_name,
            message=message,
            details=details,
        )
        state["events"].append(event)

        for callback in self._event_callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"事件回调失败: {e}")

        logger.info(f"[Commander] {event_type} @ {node_name}: {message}")

    def _save_checkpoint(self, state: PipelineState, node_name: str, attempt: int = 1):
        """保存状态检查点"""
        checkpoint = Checkpoint(
            node_name=node_name,
            state={k: v for k, v in state.items() if k not in ["events", "checkpoints"]},
            timestamp=time.time(),
            attempt=attempt,
        )
        state["checkpoints"].append(checkpoint)

    def _rollback_to_checkpoint(self, state: PipelineState, node_name: str) -> bool:
        """回滚到指定节点之前的检查点"""
        for i in range(len(state["checkpoints"]) - 1, -1, -1):
            cp = state["checkpoints"][i]
            if cp["node_name"] == node_name:
                prev_cp = state["checkpoints"][i - 1] if i > 0 else None
                if prev_cp:
                    state.update(prev_cp["state"].copy())
                    self._emit_event(state, "ROLLBACK", node_name, f"回滚到 {prev_cp['node_name']} 的检查点")
                    return True
                break
        return False

    def _detect_failure(self, output: Any, exception: Optional[Exception] = None) -> bool:
        """检测语义崩溃"""
        if exception:
            return True

        if isinstance(output, dict):
            if not output.get("success", True):
                return True
            if output.get("error"):
                return True

        return False

    def _trigger_demo_crash(self, state: PipelineState, node_name: str) -> bool:
        """演示模式下触发崩溃"""
        if not state.get("demo_crash_trigger"):
            return False

        if state["demo_crash_trigger"] == node_name:
            import random
            if random.random() < state.get("crash_probability", 0.0):
                self._emit_event(state, "DEMO_CRASH", node_name, "演示模式：主动触发崩溃")
                return True

        return False

    def _switch_to_backup(self, state: PipelineState) -> bool:
        """切换到备用 Agent（局部切换，不污染全局 llm_service）

        评审 #2 加固：删掉 llm_service.set_primary_provider() 全局调用。
        provider 切换只记录在 state["agent_pool"]["current_provider"]，
        实际 LLM 调用的 fallback 由 module 路由链处理。
        """
        agent_pool = state["agent_pool"]
        current_provider = agent_pool["current_provider"]
        backups = agent_pool["backup"]

        for backup in backups:
            if backup["provider"] != current_provider:
                agent_pool["current_provider"] = backup["provider"]
                agent_pool["fail_count"] += 1
                agent_pool["last_switch_time"] = time.time()

                # 不再调 llm_service.set_primary_provider() — 全局污染
                # LLM 调用的 fallback 由 module 路由链处理（spec §4.1）

                self._emit_event(
                    state,
                    "SWITCH_AGENT",
                    "commander",
                    f"切换到备用 Agent: {backup['provider']}",
                    {
                        "from_provider": current_provider,
                        "to_provider": backup["provider"],
                        "fail_count": agent_pool["fail_count"],
                    }
                )
                return True

        return False

    def _reset_agent_pool(self, state: PipelineState):
        """恢复到主 Agent（冷却后，局部恢复，不污染全局）"""
        agent_pool = state["agent_pool"]
        if agent_pool["last_switch_time"] is not None and (
            time.time() - agent_pool["last_switch_time"] > self.RECOVERY_COOLDOWN
        ):
            primary_provider = agent_pool["primary"]["provider"]
            agent_pool["current_provider"] = primary_provider
            agent_pool["fail_count"] = 0
            agent_pool["last_switch_time"] = None

            # 不再调 llm_service.set_primary_provider() — 全局污染

            self._emit_event(
                state,
                "AGENT_RECOVERED",
                "commander",
                f"恢复到主 Agent: {primary_provider}",
            )

    def wrap_node(self, node_func: Callable) -> Callable:
        """包装节点函数，注入容错逻辑"""
        @wraps(node_func)
        async def wrapped_node(state: PipelineState) -> PipelineState:
            node_name = state.get("step", "unknown")

            if self._trigger_demo_crash(state, node_name):
                raise FaultHotSwappingError("演示模式：模拟节点崩溃")

            self._save_checkpoint(state, node_name, attempt=1)
            self._emit_event(state, "NODE_START", node_name, f"开始执行 {node_name}")

            for attempt in range(1, self.MAX_RETRY_ATTEMPTS + 1):
                try:
                    if attempt > 1:
                        self._emit_event(state, "RETRY", node_name, f"第 {attempt} 次重试")

                    result_state = await node_func(state)

                    if self._detect_failure(
                        result_state.get("final_result"),
                        result_state.get("error")
                    ):
                        raise FaultHotSwappingError(
                            f"语义崩溃检测: {result_state.get('error', '未知错误')}"
                        )

                    self._emit_event(state, "NODE_SUCCESS", node_name, f"{node_name} 执行成功")
                    return result_state

                except Exception as e:
                    self._emit_event(state, "NODE_FAILURE", node_name, str(e))

                    if attempt >= self.MAX_RETRY_ATTEMPTS:
                        break

                    if self._switch_to_backup(state):
                        self._rollback_to_checkpoint(state, node_name)
                        continue

                    break

            self._emit_event(state, "CRITICAL_FAILURE", node_name, "所有重试和热替换均失败")
            state["final_result"] = {
                "success": False,
                "error": f"{node_name} 节点执行失败，已尝试所有可用 Agent",
                "fail_count": state["agent_pool"]["fail_count"],
            }
            return state

        return wrapped_node


commander = Commander()