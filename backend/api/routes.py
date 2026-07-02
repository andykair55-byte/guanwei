"""API 路由定义"""
import logging
import uuid
import time
import json
import asyncio
from typing import Literal, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
from pipeline.orchestrator import orchestrator
from pipeline.commander import commander
from pipeline.ws_manager import ws_manager
from agents.moderator import moderator_agent
from agents.models import ModeratorInput
from services.evidence import EvidenceService, get_evidence_service
from models import PipelineRun

logger = logging.getLogger(__name__)

router = APIRouter()


class VerifyRequest(BaseModel):
    """求证请求"""
    content: str = Field(description="待验证的信息内容")
    type: Literal["text", "link"] = Field(default="text", description="内容类型")
    demo_crash_trigger: Optional[str] = Field(default=None, description="演示模式 - 指定崩溃节点")
    crash_probability: float = Field(default=0.0, description="演示模式 - 崩溃概率")


class VerifyResponse(BaseModel):
    """求证响应"""
    success: bool
    result: dict | None = None
    error: str | None = None
    pipeline_id: str | None = None


class ModerateRequest(BaseModel):
    """内容审核请求"""
    text: str = Field(description="待审核的文本内容")


class ModerateResponse(BaseModel):
    """内容审核响应"""
    success: bool
    result: dict | None = None
    error: str | None = None


PIPELINE_TIMEOUT = 120  # 秒

@router.post("/verify", response_model=VerifyResponse)
async def verify(request: VerifyRequest, db: Session = Depends(get_db)):
    """一键求证接口

    执行完整的信息验证流程：
    1. 内容审核  2. 信息搜集  3. 来源验证  4. 深度分析
    - 超时控制 120 秒
    - 运行记录持久化到 pipeline_runs 表
    """
    pipeline_id = str(uuid.uuid4())
    start_ts = time.time()
    logger.info(f"Verify request [{pipeline_id}]: {request.content[:100]}")

    # 创建运行记录
    run = PipelineRun(
        pipeline_id=pipeline_id,
        input_content=request.content[:2000],
        status="running",
    )
    db.add(run)
    db.commit()

    events_collected: list = []

    def event_callback(event):
        event["pipeline_id"] = pipeline_id
        events_collected.append(event)
        ws_manager.broadcast(pipeline_id, event)

    commander.register_event_callback(event_callback)

    try:
        result = await asyncio.wait_for(
            orchestrator.run(
                request.content,
                demo_crash_trigger=request.demo_crash_trigger,
                crash_probability=request.crash_probability,
            ),
            timeout=PIPELINE_TIMEOUT,
        )
    except asyncio.TimeoutError:
        duration_ms = int((time.time() - start_ts) * 1000)
        run.status = "timeout"
        run.duration_ms = duration_ms
        run.error_message = f"Pipeline 执行超时 ({PIPELINE_TIMEOUT}s)"
        run.event_log = json.dumps(events_collected, ensure_ascii=False)
        db.commit()
        return VerifyResponse(success=False, error=run.error_message, pipeline_id=pipeline_id)
    except Exception as e:
        duration_ms = int((time.time() - start_ts) * 1000)
        run.status = "failed"
        run.duration_ms = duration_ms
        run.error_message = str(e)
        run.event_log = json.dumps(events_collected, ensure_ascii=False)
        db.commit()
        return VerifyResponse(success=False, error=str(e), pipeline_id=pipeline_id)

    duration_ms = int((time.time() - start_ts) * 1000)
    run.duration_ms = duration_ms
    run.event_log = json.dumps(events_collected, ensure_ascii=False)

    if result.get("error"):
        run.status = "failed"
        run.error_message = result["error"]
        db.commit()
        return VerifyResponse(success=False, error=result["error"], pipeline_id=pipeline_id)

    # 提取节点结果
    node_results = {}
    for key in ["moderation_result", "collected_sources", "verified_sources", "analysis_result"]:
        if key in result:
            node_results[key] = "success"
    run.node_results = json.dumps(node_results, ensure_ascii=False)
    run.status = "success"
    db.commit()

    return VerifyResponse(success=True, result=result, pipeline_id=pipeline_id)


@router.websocket("/ws/{pipeline_id}")
async def websocket_endpoint(websocket: WebSocket, pipeline_id: str):
    """Pipeline 实时事件 WebSocket 连接"""
    await ws_manager.connect(websocket, pipeline_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, pipeline_id)


@router.post("/moderate", response_model=ModerateResponse)
async def moderate(request: ModerateRequest):
    """内容审核接口

    检测内容是否包含：
    - 政治敏感内容
    - 暴力血腥内容
    - 色情低俗内容
    - 隐私泄露风险
    - 煽动对立言论
    """
    logger.info(f"Moderate request: {request.text[:50]}...")
    input_data = ModeratorInput(text=request.text)
    result = await moderator_agent.run(input_data)

    if result.success:
        return ModerateResponse(success=True, result=result.data)
    else:
        return ModerateResponse(success=False, error=result.error)


@router.get("/health")
async def health():
    """健康检查接口"""
    return {
        "status": "healthy",
        "service": "见微 API",
        "version": "1.0.0"
    }


# ===== 模型管理 =====

from services.llm import llm_service


class SetProviderRequest(BaseModel):
    """设置模型提供商请求"""
    provider: str = Field(description="模型提供商名称")


@router.get("/models/providers")
async def list_providers():
    """列出所有可用的模型提供商"""
    providers = llm_service.list_available_providers()
    return {
        "current": llm_service.primary_provider,
        "providers": providers
    }


@router.post("/models/set-provider")
async def set_provider(request: SetProviderRequest):
    """设置当前使用的模型提供商"""
    try:
        llm_service.set_primary_provider(request.provider)
        return {"success": True, "current": request.provider}
    except ValueError as e:
        return {"success": False, "error": str(e)}


# ===== 证据链 API =====


class EvidenceCreateRequest(BaseModel):
    """创建证据链请求"""
    report_id: int = Field(description="报告 ID")
    source_url: str = Field(description="来源 URL")
    source_type: Literal["official", "media", "social", "forum"] = Field(description="来源类型")
    content_summary: str = Field(description="内容摘要")
    credibility_level: int | None = Field(default=None, description="可信度等级（1-5）")
    relevance_score: float = Field(default=0.0, description="相关性评分（0-1）")


class EvidenceResponse(BaseModel):
    """证据链响应"""
    id: int
    source_url: str
    source_type: str
    credibility_level: int
    credibility_score: float
    content_summary: str
    relevance_score: float
    timestamp: str | None
    created_at: str


@router.post("/evidence", response_model=EvidenceResponse)
async def create_evidence(
    request: EvidenceCreateRequest,
    db: Session = Depends(get_db)
):
    """创建证据链项"""
    service = get_evidence_service(db)
    evidence = service.create_evidence(
        report_id=request.report_id,
        source_url=request.source_url,
        source_type=request.source_type,
        content_summary=request.content_summary,
        credibility_level=request.credibility_level,
        relevance_score=request.relevance_score
    )
    return EvidenceResponse(**service.to_dict(evidence))


@router.get("/evidence/report/{report_id}", response_model=List[EvidenceResponse])
async def get_evidence_by_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    """获取报告的证据链（按可信度排序）"""
    service = get_evidence_service(db)
    evidences = service.get_evidence_by_report(report_id)
    return [EvidenceResponse(**service.to_dict(e)) for e in evidences]


@router.get("/evidence/melon/{melon_id}", response_model=List[EvidenceResponse])
async def get_evidence_by_melon(
    melon_id: int,
    db: Session = Depends(get_db)
):
    """通过瓜 ID 获取证据链"""
    service = get_evidence_service(db)
    evidences = service.get_evidence_by_melon(melon_id)
    return [EvidenceResponse(**service.to_dict(e)) for e in evidences]


@router.get("/evidence/report/{report_id}/top", response_model=List[EvidenceResponse])
async def get_top_evidences(
    report_id: int,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """获取可信度最高的 N 条证据"""
    service = get_evidence_service(db)
    evidences = service.get_top_evidences(report_id, limit)
    return [EvidenceResponse(**service.to_dict(e)) for e in evidences]


from api.user_routes import router as user_router
from api.melon_routes import router as melon_router
from api.admin_routes import router as admin_router
from services.metrics import MetricsService, get_metrics_service

router.include_router(user_router)
router.include_router(melon_router)
router.include_router(admin_router)


# ===== 监控指标 API =====


@router.get("/metrics/system")
async def get_system_metrics(db: Session = Depends(get_db)):
    """获取系统指标"""
    service = get_metrics_service(db)
    return service.get_system_metrics()


@router.get("/metrics/business")
async def get_business_metrics(db: Session = Depends(get_db)):
    """获取业务指标"""
    service = get_metrics_service(db)
    return service.get_business_metrics()


@router.get("/metrics/rank-distribution")
async def get_rank_distribution(db: Session = Depends(get_db)):
    """获取段位分布"""
    service = get_metrics_service(db)
    return service.get_rank_distribution()
