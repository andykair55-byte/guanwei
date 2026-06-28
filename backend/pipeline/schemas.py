"""Pipeline 状态类型定义"""
from typing import TypedDict


class PipelineState(TypedDict):
    """Pipeline 执行状态"""

    user_input: str
    collected_sources: list[dict]
    verified_sources: list[dict]
    analysis_result: dict | None
    moderation_result: dict
    final_result: dict | None
    error: str | None
    step: str  # 当前执行步骤
