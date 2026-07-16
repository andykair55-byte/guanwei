"""LangGraph 编排器 - 容错内核

核心架构：
1. Commander 拦截器 - 包装每个节点，注入容错逻辑
2. AgentPool - 主备 Agent 池，支持热替换
3. Checkpointer - 状态检查点机制，支持回滚
4. EventSystem - 实时事件广播，支持 WebSocket 推送
"""
import logging
import uuid
import time
from typing import Literal, Callable, Any

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from pipeline.schemas import PipelineState
from pipeline.commander import commander
from agents.models import (
    CollectorInput,
    VerifierInput,
    AnalyzerInput,
    ModeratorInput,
    SourceItem,
    VerifiedSource,
)
from agents.collector import collector_agent
from agents.verifier import verifier_agent
from agents.analyzer import analyzer_agent
from agents.moderator import moderator_agent

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """Pipeline 编排器 - 容错内核"""

    def __init__(self):
        self.checkpointer = MemorySaver()
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """构建带容错能力的 LangGraph DAG"""
        graph = StateGraph(PipelineState)

        graph.add_node("moderation", commander.wrap_node(self._moderation_node))
        graph.add_node("collector", commander.wrap_node(self._collector_node))
        graph.add_node("verifier", commander.wrap_node(self._verifier_node))
        graph.add_node("analyzer", commander.wrap_node(self._analyzer_node))

        graph.set_entry_point("moderation")

        graph.add_conditional_edges(
            "moderation",
            self._should_proceed,
            {
                "proceed": "collector",
                "block": END,
            }
        )

        graph.add_edge("collector", "verifier")
        graph.add_edge("verifier", "analyzer")
        graph.add_edge("analyzer", END)

        return graph.compile(checkpointer=self.checkpointer)

    def _should_proceed(self, state: PipelineState) -> Literal["proceed", "block"]:
        """判断是否继续执行"""
        moderation_result = state.get("moderation_result", {})
        if moderation_result.get("action") == "拦截":
            state["final_result"] = {
                "success": False,
                "error": "内容审核未通过",
                "moderation_result": moderation_result,
            }
            return "block"
        return "proceed"

    async def _moderation_node(self, state: PipelineState) -> PipelineState:
        """审核节点"""
        logger.info("[Pipeline] Step 1: Moderation")
        state["step"] = "moderation"

        try:
            input_data = ModeratorInput(text=state["user_input"])
            output = await moderator_agent.run(input_data)

            if output.success:
                state["moderation_result"] = output.data.get("result", {})
            else:
                state["moderation_result"] = {
                    "passed": True,
                    "action": "通过",
                    "reasons": ["审核服务异常，默认通过"],
                    "categories": [],
                }
        except Exception as e:
            logger.error(f"Moderation error: {e}")
            state["moderation_result"] = {
                "passed": True,
                "action": "通过",
                "reasons": [f"审核异常: {str(e)}"],
                "categories": [],
            }

        return state

    async def _collector_node(self, state: PipelineState) -> PipelineState:
        """搜集节点"""
        logger.info("[Pipeline] Step 2: Collection")
        state["step"] = "collector"

        try:
            input_data = CollectorInput(
                query=state["user_input"], max_sources=10
            )
            output = await collector_agent.run(input_data)

            if output.success:
                sources_data = output.data.get("sources", [])
                state["collected_sources"] = sources_data
            else:
                state["collected_sources"] = []
                state["error"] = f"搜集失败: {output.error}"
        except Exception as e:
            logger.error(f"Collection error: {e}")
            state["collected_sources"] = []
            state["error"] = f"搜集异常: {str(e)}"

        return state

    async def _verifier_node(self, state: PipelineState) -> PipelineState:
        """验证节点"""
        logger.info("[Pipeline] Step 3: Verification")
        state["step"] = "verifier"

        try:
            sources = [
                SourceItem(**s) for s in state.get("collected_sources", [])
                if s.get("content")
            ]

            if not sources:
                state["verified_sources"] = []
                return state

            input_data = VerifierInput(sources=sources)
            output = await verifier_agent.run(input_data)

            if output.success:
                state["verified_sources"] = output.data.get("verified_sources", [])
            else:
                state["verified_sources"] = []
                state["error"] = f"验证失败: {output.error}"
        except Exception as e:
            logger.error(f"Verification error: {e}")
            state["verified_sources"] = []
            state["error"] = f"验证异常: {str(e)}"

        return state

    async def _analyzer_node(self, state: PipelineState) -> PipelineState:
        """分析节点"""
        logger.info("[Pipeline] Step 4: Analysis")
        state["step"] = "analyzer"

        try:
            verified_sources = [
                VerifiedSource(**s) for s in state.get("verified_sources", [])
            ]

            if not verified_sources:
                state["analysis_result"] = {
                    "timeline": [],
                    "evidence_chain": [],
                    "key_doubts": ["未能收集到足够来源进行分析"],
                    "tendency": "无法判断",
                    "tendency_direction": False,
                    "disclaimer": "AI核查仅供参考，不构成任何建议",
                }
                state["final_result"] = {
                    "success": True,
                    "analysis": state["analysis_result"],
                    "sources_count": 0,
                }
                return state

            input_data = AnalyzerInput(
                original_query=state["user_input"],
                verified_sources=verified_sources,
            )
            output = await analyzer_agent.run(input_data)

            if output.success and output.data.get("result"):
                state["analysis_result"] = output.data["result"]
                state["final_result"] = {
                    "success": True,
                    "analysis": state["analysis_result"],
                    "sources_count": len(verified_sources),
                }
            else:
                state["analysis_result"] = None
                state["final_result"] = {
                    "success": False,
                    "error": f"分析失败: {output.error}",
                }
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            state["analysis_result"] = None
            state["final_result"] = {
                "success": False,
                "error": f"分析异常: {str(e)}",
            }

        return state

    async def run(
        self,
        user_input: str,
        demo_crash_trigger: str = None,
        crash_probability: float = 0.0,
    ) -> dict:
        """执行完整 Pipeline

        Args:
            user_input: 用户输入的待验证信息
            demo_crash_trigger: 演示模式 - 指定在哪个节点触发崩溃
            crash_probability: 演示模式 - 崩溃概率 (0.0-1.0)

        Returns:
            Pipeline 执行结果，包含事件日志和最终结果
        """
        thread_id = str(uuid.uuid4())

        initial_state: PipelineState = {
            "user_input": user_input,
            "collected_sources": [],
            "verified_sources": [],
            "analysis_result": None,
            "moderation_result": {},
            "final_result": None,
            "error": None,
            "step": "start",
            "agent_pool": commander._init_agent_pool(),
            "checkpoints": [],
            "events": [],
            "demo_crash_trigger": demo_crash_trigger,
            "crash_probability": crash_probability,
        }

        try:
            result = await self.graph.ainvoke(
                initial_state,
                config={"configurable": {"thread_id": thread_id}}
            )

            final_result = result.get("final_result") or {
                "success": False,
                "error": result.get("error") or "Pipeline 执行异常",
            }

            final_result["events"] = result.get("events", [])
            final_result["agent_pool_state"] = {
                "current_provider": result["agent_pool"]["current_provider"],
                "fail_count": result["agent_pool"]["fail_count"],
                "backup_count": len(result["agent_pool"]["backup"]),
            }
            final_result["checkpoint_count"] = len(result.get("checkpoints", []))

            return final_result

        except Exception as e:
            logger.error(f"Pipeline error: {e}")
            return {
                "success": False,
                "error": str(e),
                "events": [],
                "agent_pool_state": None,
                "checkpoint_count": 0,
            }


orchestrator = PipelineOrchestrator()