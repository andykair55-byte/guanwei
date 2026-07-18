# backend/services/workspace/runtime.py
"""工作间 Agent 运行时 — 超时/重试/降级/事件/记录
评审 #3：基于异常类型决策重试，不依赖字符串匹配
"""
import asyncio
import inspect
import logging
import time
import random
import string
from datetime import datetime
from typing import Callable

from services.workspace.agents.base_agent import (
    WorkspaceBaseAgent, WorkspaceAgentInput, WorkspaceAgentOutput,
    RetryableError, NonRetryableError,
)
from services.workspace.state import WorkspaceState
from services.workspace.event_bus import event_bus

logger = logging.getLogger(__name__)


class AgentRuntime:
    """统一执行环境 — 包在 agent 外层，注入横切逻辑"""

    def wrap(self, agent: WorkspaceBaseAgent) -> Callable:
        """返回 LangGraph 节点函数（sync 包装，内部节点是 async）"""
        async def node_func(state: WorkspaceState) -> WorkspaceState:
            return await self._execute_node(agent, state)
        return node_func

    def wrap_orchestrator(self, node_func: Callable) -> Callable:
        """包装 orchestrator 节点（dynamic 策略用）"""
        async def wrapped(state: WorkspaceState) -> WorkspaceState:
            return await node_func(state)
        return wrapped

    async def _execute_node(
        self,
        agent: WorkspaceBaseAgent,
        state: WorkspaceState,
    ) -> WorkspaceState:
        """单节点完整执行流程：事件 → 超时 → 异常类型决策重试 → 降级 → 记录"""
        workspace_id = state["workspace_id"]
        agent_type = agent.agent_type
        timeout = agent.default_timeout
        upstream = state.get("upstream", {})

        input_data = WorkspaceAgentInput(
            workspace_id=workspace_id,
            topic=state["topic"],
            platform_order=state.get("platform_order", []),
            upstream=upstream,
        )

        await self._emit_event(workspace_id, "agent_started", agent_type,
            f"{agent_type} agent 开始执行",
            f"正在处理：{state['topic'][:50]}")

        start_ts = time.time()
        started_at = datetime.utcnow()
        retry_count = 0

        try:
            output = await asyncio.wait_for(agent.run(input_data), timeout=timeout)

            if not isinstance(output, WorkspaceAgentOutput):
                output = WorkspaceAgentOutput(
                    success=False,
                    degraded=True,
                    degraded_reason="type_error",
                    error="agent 返回类型错误",
                )

        except NonRetryableError as e:
            # 评审 #3：不可重试错误 → 不重试，直接 fallback
            logger.warning(f"[Workspace {workspace_id}] {agent_type} NonRetryableError: {e}")
            output = await self._safe_fallback(agent, input_data, e)

        except RetryableError as e:
            # 评审 #3：可重试错误 → 重试 1 次
            retry_count += 1
            await self._emit_event(workspace_id, "info", agent_type,
                f"{agent_type} 重试中（第 2 次）",
                f"原因：{e}")
            try:
                output = await asyncio.wait_for(agent.run(input_data), timeout=timeout)
                if not isinstance(output, WorkspaceAgentOutput):
                    output = WorkspaceAgentOutput(
                        success=False,
                        degraded=True,
                        degraded_reason="type_error",
                        error="agent 返回类型错误",
                    )
            except NonRetryableError as e2:
                output = await self._safe_fallback(agent, input_data, e2)
            except (RetryableError, asyncio.TimeoutError, Exception) as e2:
                output = await self._safe_fallback(agent, input_data, e2)

        except asyncio.TimeoutError as e:
            # 超时视为可重试错误，重试 1 次
            retry_count += 1
            await self._emit_event(workspace_id, "error", agent_type,
                f"{agent_type} 超时（{timeout}s）",
                "启动重试或降级")
            try:
                output = await asyncio.wait_for(agent.run(input_data), timeout=timeout)
                if not isinstance(output, WorkspaceAgentOutput):
                    output = WorkspaceAgentOutput(
                        success=False,
                        degraded=True,
                        degraded_reason="type_error",
                        error="agent 返回类型错误",
                    )
            except NonRetryableError as e2:
                output = await self._safe_fallback(agent, input_data, e2)
            except (RetryableError, asyncio.TimeoutError, Exception) as e2:
                output = await self._safe_fallback(agent, input_data, e2)

        except Exception as e:
            # 评审 #3：未知异常 → 默认乐观重试 1 次（视为 RetryableError）
            logger.exception(f"[Workspace {workspace_id}] {agent_type} 未知异常: {e}")
            retry_count += 1
            try:
                output = await asyncio.wait_for(agent.run(input_data), timeout=timeout)
                if not isinstance(output, WorkspaceAgentOutput):
                    output = WorkspaceAgentOutput(
                        success=False,
                        degraded=True,
                        degraded_reason="type_error",
                        error="agent 返回类型错误",
                    )
            except Exception as e2:
                output = await self._safe_fallback(agent, input_data, e2)

        # output.success=False 但未抛异常的情况（agent 内部吞了异常）
        if not output.success and not output.degraded:
            output = await self._safe_fallback(agent, input_data, Exception(output.error or "执行失败"))

        duration_ms = int((time.time() - start_ts) * 1000)
        completed_at = datetime.utcnow()

        # 写入 upstream
        state["upstream"][agent_type] = {
            **(output.data or {}),
            "degraded": output.degraded,
            "degraded_reason": output.degraded_reason,
            "duration_ms": duration_ms,
        }

        # 记录到 agent_runs（评审 #5：含 prompt_hash + prompt_injection_blocked）
        state["agent_runs"].append({
            "workspace_id": workspace_id,
            "agent_type": agent_type,
            "status": "degraded" if output.degraded else ("success" if output.success else "failed"),
            "duration_ms": duration_ms,
            "llm_provider": output.llm_provider,
            "llm_model": output.llm_model,
            "input_tokens": output.input_tokens,
            "output_tokens": output.output_tokens,
            "input_summary": state["topic"][:200],
            "output_result": output.data,
            "error_message": output.error or output.degraded_reason,
            "retry_count": retry_count,
            "prompt_hash": output.prompt_hash,                       # 评审 #5
            "prompt_injection_blocked": output.prompt_injection_blocked,  # 评审 #5
            "started_at": started_at.isoformat(),
            "completed_at": completed_at.isoformat(),
        })

        # 推送完成事件
        completion_type = self._map_completion_event(agent_type, output)
        await self._emit_event(workspace_id, completion_type, agent_type,
            f"{agent_type} 完成",
            f"耗时 {duration_ms}ms" + (f"（降级：{output.degraded_reason}）" if output.degraded else ""),
            {
                "degraded": output.degraded,
                "degraded_reason": output.degraded_reason,
                "duration_ms": duration_ms,
                **self._summarize_output(agent_type, output),
            })

        return state

    async def _safe_fallback(
        self,
        agent: WorkspaceBaseAgent,
        input_data: WorkspaceAgentInput,
        error: Exception,
    ) -> WorkspaceAgentOutput:
        """安全调用 fallback — 永不抛异常"""
        try:
            return await agent.fallback(input_data, error)
        except Exception as fallback_err:
            logger.error(f"[Workspace] fallback 违反契约: {fallback_err}")
            return WorkspaceAgentOutput(
                success=False,
                degraded=True,
                degraded_reason=f"fallback_failed: {fallback_err}",
                error=str(error),
            )

    def _map_completion_event(self, agent_type: str, output: WorkspaceAgentOutput) -> str:
        event_map = {
            "search": "search_complete",
            "research": "research_complete",
            "verify": "verify_warning" if output.degraded else "info",
            "writing": "writing_complete",
            "platform": "platform_complete",
        }
        return event_map.get(agent_type, "info")

    def _summarize_output(self, agent_type: str, output: WorkspaceAgentOutput) -> dict:
        data = output.data or {}
        if agent_type == "search":
            return {"sources_count": len(data.get("sources", []))}
        if agent_type == "research":
            return {
                "viewpoints_count": len(data.get("viewpoints", [])),
                "based_on_external": data.get("based_on_external", False),
            }
        if agent_type == "verify":
            return {
                "verified_count": len(data.get("verified_facts", [])),
                "warnings": data.get("warnings", []),
            }
        if agent_type == "writing":
            draft = data.get("draft", {})
            return {
                "title": draft.get("title", ""),
                "sections_count": len(draft.get("sections", [])),
            }
        if agent_type == "platform":
            contents = data.get("platform_contents", {})
            return {
                "platforms": list(contents.keys()),
                "degraded_platforms": [p for p, c in contents.items() if c.get("degraded")],
            }
        return {}

    async def _emit_event(
        self,
        workspace_id: str,
        event_type: str,
        agent_type: str,
        title: str,
        content: str,
        data: dict | None = None,
    ):
        """构建并推送符合前端 ActivityEvent schema 的事件"""
        event = {
            "id": f"evt-{int(time.time() * 1000)}-{''.join(random.choices(string.ascii_lowercase, k=6))}",
            "timestamp": int(time.time() * 1000),
            "type": event_type,
            "agentType": agent_type,
            "title": title,
            "content": content,
            "data": data or {},
        }
        # 兼容 sync mock（测试）与 async event_bus（生产）
        result = event_bus.emit(workspace_id, event)
        if inspect.isawaitable(result):
            await result
