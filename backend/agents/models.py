"""Agent 输入输出类型定义"""
from pydantic import BaseModel, Field
from typing import Any


class CollectorInput(BaseModel):
    """搜集 Agent 输入"""
    query: str = Field(description="待验证的信息或关键词")
    max_sources: int = Field(default=10, description="最大来源数量")


class SourceItem(BaseModel):
    """来源条目"""
    url: str
    title: str
    content: str = ""
    published_at: str | None = None
    fetched: bool = False


class CollectorOutput(BaseModel):
    """搜集 Agent 输出"""
    success: bool
    sources: list[SourceItem] = Field(default_factory=list)
    error: str | None = None


class VerifierInput(BaseModel):
    """验证 Agent 输入"""
    sources: list[SourceItem]


class VerifiedSource(BaseModel):
    """已验证的来源"""
    url: str
    title: str
    content: str
    credibility: int = Field(ge=1, le=5, description="可信度评分 1-5 星")
    status: str = Field(description="verified/pending/unreliable")
    reason: str = ""


class VerifierOutput(BaseModel):
    """验证 Agent 输出"""
    success: bool
    verified_sources: list[VerifiedSource] = Field(default_factory=list)
    error: str | None = None


class AnalyzerInput(BaseModel):
    """分析 Agent 输入"""
    original_query: str
    verified_sources: list[VerifiedSource]


class TimelineItem(BaseModel):
    """时间线条目"""
    time: str = Field(description="时间点")
    event: str = Field(description="事件描述")
    source: str = Field(description="来源")


class EvidenceItem(BaseModel):
    """证据链条目"""
    description: str = Field(description="证据描述")
    source: str = Field(description="来源名称")
    source_url: str = Field(description="来源链接")
    credibility: int = Field(ge=1, le=5, description="可信度评分")


class AnalysisResult(BaseModel):
    """分析结果"""
    timeline: list[TimelineItem] = Field(default_factory=list, description="事件时间线")
    evidence_chain: list[EvidenceItem] = Field(default_factory=list, description="证据链")
    key_doubts: list[str] = Field(default_factory=list, description="主要疑点")
    tendency: str = Field(description="倾向性描述")
    tendency_direction: bool = Field(description="True=真, False=假")
    disclaimer: str = Field(default="AI核查仅供参考，不构成任何建议")


class AnalyzerOutput(BaseModel):
    """分析 Agent 输出"""
    success: bool
    result: AnalysisResult | None = None
    error: str | None = None


class ModeratorInput(BaseModel):
    """审核 Agent 输入"""
    text: str = Field(description="待审核文本")


class ModerationResult(BaseModel):
    """审核结果"""
    passed: bool = Field(description="是否通过")
    action: str = Field(description="通过/拦截/待审核")
    reasons: list[str] = Field(default_factory=list, description="原因列表")
    categories: list[str] = Field(default_factory=list, description="违规类别")


class ModeratorOutput(BaseModel):
    """审核 Agent 输出"""
    success: bool
    result: ModerationResult | None = None
    error: str | None = None
