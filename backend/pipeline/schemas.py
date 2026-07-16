"""Pipeline 状态类型定义 - 容错内核"""
from typing import TypedDict, Optional, List
from datetime import datetime


class AgentConfig(TypedDict):
    """Agent 配置"""
    provider: str
    model: str
    temperature: float
    max_tokens: int
    timeout: int


class Checkpoint(TypedDict):
    """状态检查点"""
    node_name: str
    state: dict
    timestamp: float
    attempt: int


class PipelineEvent(TypedDict):
    """Pipeline 事件"""
    event_id: str
    type: str
    timestamp: float
    node_name: str
    message: str
    details: Optional[dict] = None


class AgentPoolState(TypedDict):
    """Agent 池状态"""
    primary: AgentConfig
    backup: List[AgentConfig]
    current_provider: str
    fail_count: int
    last_switch_time: Optional[float] = None


class PipelineState(TypedDict):
    """Pipeline 执行状态 - 集成容错内核"""

    user_input: str
    collected_sources: list[dict]
    verified_sources: list[dict]
    analysis_result: dict | None
    moderation_result: dict
    final_result: dict | None
    error: str | None
    step: str

    agent_pool: AgentPoolState
    checkpoints: List[Checkpoint]
    events: List[PipelineEvent]

    demo_crash_trigger: Optional[str] = None
    crash_probability: float = 0.0
