"""API 路由定义"""
import logging
import uuid
import time
import json
import asyncio
import hashlib
from datetime import datetime, timedelta
from typing import Literal, List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from pipeline.orchestrator import orchestrator
from pipeline.commander import commander
from pipeline.ws_manager import ws_manager
from agents.moderator import moderator_agent
from agents.models import ModeratorInput
from services.evidence import EvidenceService, get_evidence_service
from models import PipelineRun, User
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


class VerifyRequest(BaseModel):
    """求证请求"""
    content: str = Field(..., max_length=2000, description="待验证的信息内容")
    type: Literal["text", "link"] = Field(default="text", description="内容类型")
    demo_crash_trigger: Optional[str] = Field(default=None, description="演示模式 - 指定崩溃节点")
    crash_probability: float = Field(default=0.0, description="演示模式 - 崩溃概率")


class VerifyResponse(BaseModel):
    """求证响应"""
    success: bool
    result: dict | None = None
    error: str | None = None
    pipeline_id: str | None = None
    status: str | None = None


class ModerateRequest(BaseModel):
    """内容审核请求"""
    text: str = Field(..., max_length=5000, description="待审核的文本内容")


class ModerateResponse(BaseModel):
    """内容审核响应"""
    success: bool
    result: dict | None = None
    error: str | None = None


PIPELINE_TIMEOUT = 120  # 秒


# ================================================================
#  并发限流（spec: 2026-07-18-verify-pipeline-hardening §4.2）
# ================================================================
_verify_semaphore = asyncio.Semaphore(10)  # 最多 10 个并发 verify


async def run_pipeline_background(
    pipeline_id: str,
    content: str,
    demo_crash_trigger: str | None = None,
    crash_probability: float = 0.0,
):
    """后台执行 Pipeline"""
    db = SessionLocal()
    try:
        run = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id).first()
        if not run:
            logger.warning(f"后台任务未找到 PipelineRun: {pipeline_id}")
            return

        run.status = "running"
        db.commit()

        events_collected = []

        def event_callback(event):
            event["pipeline_id"] = pipeline_id
            events_collected.append(event)
            ws_manager.broadcast(pipeline_id, event)

        commander.register_event_callback(event_callback)

        start_ts = time.time()

        try:
            result = await asyncio.wait_for(
                orchestrator.run(
                    content,
                    demo_crash_trigger=demo_crash_trigger,
                    crash_probability=crash_probability,
                ),
                timeout=PIPELINE_TIMEOUT,
            )

            duration_ms = int((time.time() - start_ts) * 1000)
            run.duration_ms = duration_ms
            run.event_log = json.dumps(events_collected, ensure_ascii=False)

            if result.get("error"):
                run.status = "failed"
                run.error_message = result["error"]
            else:
                run.status = "success"
                node_results = {}
                for key in ["moderation_result", "collected_sources", "verified_sources", "analysis_result"]:
                    if key in result:
                        node_results[key] = "success"
                run.node_results = json.dumps(node_results, ensure_ascii=False)

            db.commit()

            ws_manager.broadcast(pipeline_id, {
                "type": "PIPELINE_COMPLETE",
                "pipeline_id": pipeline_id,
                "status": run.status,
                "result": result if run.status == "success" else None,
                "error": run.error_message if run.status == "failed" else None,
            })

        except asyncio.TimeoutError:
            duration_ms = int((time.time() - start_ts) * 1000)
            run.status = "timeout"
            run.duration_ms = duration_ms
            run.error_message = f"Pipeline 执行超时 ({PIPELINE_TIMEOUT}s)"
            run.event_log = json.dumps(events_collected, ensure_ascii=False)
            db.commit()

            ws_manager.broadcast(pipeline_id, {
                "type": "PIPELINE_FAILED",
                "pipeline_id": pipeline_id,
                "error": run.error_message,
            })

        except Exception as e:
            duration_ms = int((time.time() - start_ts) * 1000)
            run.status = "failed"
            run.duration_ms = duration_ms
            run.error_message = str(e)
            run.event_log = json.dumps(events_collected, ensure_ascii=False)
            db.commit()

            ws_manager.broadcast(pipeline_id, {
                "type": "PIPELINE_FAILED",
                "pipeline_id": pipeline_id,
                "error": str(e),
            })

        logger.info(f"后台 Pipeline 完成 [{pipeline_id}]: status={run.status}, duration={run.duration_ms}ms")

    except Exception as e:
        logger.exception(f"后台 Pipeline 任务异常 [{pipeline_id}]: {e}")
        try:
            run = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id).first()
            if run:
                run.status = "failed"
                run.error_message = f"后台任务异常: {str(e)}"
                db.commit()
        except Exception:
            pass
    finally:
        try:
            db.close()
        except Exception:
            pass


@router.post("/verify", response_model=VerifyResponse)
async def verify(
    request: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """一键求证接口（异步模式）

    提交 Pipeline 任务后立即返回，可通过 GET /pipeline/{id} 查询状态，
    或通过 WebSocket 监听实时事件。

    执行完整的信息验证流程：
    1. 内容审核  2. 信息搜集  3. 来源验证  4. 深度分析

    认证可选：已登录用户记录 user_id，未登录用户 user_id=None
    """
    # 幂等检查：content hash + user_id（spec §4.1）
    content_hash = hashlib.sha256(request.content.encode()).hexdigest()[:16]
    user_part = str(current_user.id) if current_user else "anon"
    idempotency_key = f"{user_part}-{content_hash}"

    existing = db.query(PipelineRun).filter(
        PipelineRun.idempotency_key == idempotency_key,
        PipelineRun.status.in_(["pending", "running"]),
        PipelineRun.created_at > datetime.utcnow() - timedelta(minutes=5),
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "DUPLICATE_SUBMIT",
                "message": "相同内容正在处理中，请勿重复提交",
                "existing_pipeline_id": existing.pipeline_id,
            }
        )

    # 并发限流（spec §4.2）
    if _verify_semaphore.locked() and _verify_semaphore._value == 0:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "RATE_LIMITED",
                "message": "当前并发请求过多，请稍后重试",
                "retry_after_seconds": 30,
            }
        )

    async with _verify_semaphore:
        pipeline_id = str(uuid.uuid4())
        logger.info(f"Verify request [{pipeline_id}]: {request.content[:100]}")

        run = PipelineRun(
            pipeline_id=pipeline_id,
            input_content=request.content[:2000],
            status="pending",
            user_id=current_user.id if current_user else None,
            idempotency_key=idempotency_key,
        )
        db.add(run)
        db.commit()

        asyncio.create_task(run_pipeline_background(
            pipeline_id=pipeline_id,
            content=request.content,
            demo_crash_trigger=request.demo_crash_trigger,
            crash_probability=request.crash_probability,
        ))

        return VerifyResponse(
            success=True,
            result=None,
            error=None,
            pipeline_id=pipeline_id,
            status="pending",
        )


@router.get("/pipeline/{pipeline_id}")
def get_pipeline_status(pipeline_id: str, db: Session = Depends(get_db)):
    """查询 Pipeline 运行状态"""
    run = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # 僵尸 running 懒检查 reaper（spec §4.3）
    if run.status == "running":
        idle_threshold = datetime.utcnow() - timedelta(minutes=5)
        if run.updated_at < idle_threshold:
            run.status = "failed"
            run.error_message = "执行超时（reaper 标记）"
            db.commit()
            db.refresh(run)

    node_results = {}
    if run.node_results:
        try:
            node_results = json.loads(run.node_results)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "pipeline_id": run.pipeline_id,
        "status": run.status,
        "duration_ms": run.duration_ms,
        "error_message": run.error_message,
        "node_results": node_results,
        "created_at": run.created_at,
    }


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
