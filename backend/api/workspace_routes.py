# backend/api/workspace_routes.py
"""工作间 API — REST + WebSocket"""
import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import Workspace, WorkspaceAgentRun, PublishTask, User
from auth import get_current_user, require_current_user
from services.workspace.engine import workspace_engine
from services.workspace.event_bus import event_bus
from services.workspace.experience import experience_store
from services.workspace.config.platform_urls import PLATFORM_PUBLISH_URLS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["工作间"])
publish_router = APIRouter(prefix="/publish", tags=["发布队列"])


def _get_db():
    """DB 依赖入口 — 请求时从模块命名空间动态解析 get_db, 支持 test patch.

    FastAPI 的 ``Depends(_get_db)`` 在路由注册时即固化函数引用,
    测试通过 ``patch('api.workspace_routes.get_db')`` 注入测试 session 时,
    需要此包装器在请求时动态查找 ``get_db`` 才能让 patch 生效.
    """
    result = get_db()
    if hasattr(result, '__next__'):
        # 原生 get_db 是 generator function (yield db)
        yield from result
    else:
        # 测试 patch: get_db() 直接返回 Session 对象
        yield result


def _to_workspace_response(ws: Workspace) -> dict:
    return {
        "workspace_id": ws.workspace_id,
        "topic": ws.topic,
        "title": ws.title,
        "status": ws.status,
        "strategy": ws.strategy,
        "platform_order": json.loads(ws.platform_order or "[]"),
        "draft": json.loads(ws.draft or "{}"),
        "platform_contents": json.loads(ws.platform_contents or "{}"),
        "duration_ms": ws.duration_ms,
        "error_message": ws.error_message or "",
        "created_at": ws.created_at.isoformat() if ws.created_at else "",
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else "",
    }


def _to_publish_response(t: PublishTask) -> dict:
    return {
        "id": t.id,
        "workspace_id": t.workspace_id,
        "platform": t.platform,
        "title": t.title,
        "content": t.content,
        "publish_url": t.publish_url,
        "status": t.status,
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "operated_at": t.operated_at.isoformat() if t.operated_at else None,
    }


@router.post("")
async def create_workspace(
    req: dict,
    db: Session = Depends(_get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    workspace_id = str(uuid.uuid4())
    ws = Workspace(
        workspace_id=workspace_id,
        user_id=current_user.id if current_user else None,
        topic=req.get("topic", ""),
        title=req.get("title") or req.get("topic", "")[:50],
        strategy="dag",
        status="draft",
        platform_order=json.dumps(req.get("platform_order", ["guanwei", "zhihu", "xiaohongshu"])),
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return _to_workspace_response(ws)


@router.get("")
def list_workspaces(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(_get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(Workspace)
    if current_user:
        query = query.filter(Workspace.user_id == current_user.id)
    if status:
        query = query.filter(Workspace.status == status)

    items = query.order_by(Workspace.created_at.desc()) \
        .offset((page - 1) * size).limit(size).all()
    return [_to_workspace_response(w) for w in items]


@router.get("/{workspace_id}")
async def get_workspace(workspace_id: str, db: Session = Depends(_get_db)):
    ws = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # 评审 #2：懒检查僵尸状态 — running 超过 5 分钟且无新事件 → 标 failed
    # 阈值理由：DAG 策略最坏情况总耗时上限 ≈ 5 分钟（spec §6.4）
    if ws.status == "running":
        idle_seconds = (datetime.utcnow() - ws.updated_at).total_seconds() if ws.updated_at else float('inf')
        last_event_age = event_bus.last_event_age_seconds(workspace_id)
        if idle_seconds > 300 and last_event_age > 300:
            ws.status = "failed"
            ws.error_message = f"运行超时（{int(idle_seconds)}s 无进展），已标记失败"
            db.commit()
            # 推送 error 事件，让前端 WS 连接立即感知
            await event_bus.emit(workspace_id, {
                "id": f"evt-{int(datetime.utcnow().timestamp() * 1000)}-reaper",
                "timestamp": int(datetime.utcnow().timestamp() * 1000),
                "type": "error",
                "agentType": "system",
                "title": "运行超时",
                "content": ws.error_message,
                "data": {"reaper": True, "idle_seconds": int(idle_seconds)},
            })

    return _to_workspace_response(ws)


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: str, db: Session = Depends(_get_db)):
    ws = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.query(WorkspaceAgentRun).filter(WorkspaceAgentRun.workspace_id == workspace_id).delete()
    db.query(PublishTask).filter(PublishTask.workspace_id == workspace_id).delete()
    db.delete(ws)
    db.commit()
    return {"success": True}


@router.post("/{workspace_id}/run")
async def run_workspace(
    workspace_id: str,
    req: dict,
    db: Session = Depends(_get_db),
):
    ws = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # 评审 #2：409 防重入 — 结构化 detail 便于前端区分"已在运行"vs其他冲突
    if ws.status == "running":
        raise HTTPException(
            status_code=409,
            detail={
                "error": "already_running",
                "started_at": ws.updated_at.isoformat() if ws.updated_at else None,
                "workspace_id": workspace_id,
            },
        )

    ws.strategy = req.get("strategy", "dag")
    ws.status = "running"
    ws.error_message = ""  # 清空上次错误，避免显示陈旧错误
    db.commit()

    platform_order = json.loads(ws.platform_order or "[]")

    asyncio.create_task(_run_workspace_background(
        workspace_id=workspace_id,
        topic=ws.topic,
        platform_order=platform_order,
        strategy=ws.strategy,
        custom_dag=req.get("custom_dag"),
    ))

    return {"success": True, "workspace_id": workspace_id, "status": "running"}


async def _run_workspace_background(
    workspace_id: str,
    topic: str,
    platform_order: list[str],
    strategy: str,
    custom_dag: dict | None,
):
    db = SessionLocal()
    try:
        result = await workspace_engine.run(
            workspace_id=workspace_id,
            topic=topic,
            platform_order=platform_order,
            strategy=strategy,
            custom_dag=custom_dag,
        )

        ws = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if ws:
            ws.status = "success" if result.get("success") else "failed"
            if result.get("partial"):
                ws.status = "partial"
            ws.draft = json.dumps(result.get("draft", {}), ensure_ascii=False, default=str)
            ws.platform_contents = json.dumps(
                result.get("platform_contents", {}), ensure_ascii=False, default=str
            )
            ws.duration_ms = result.get("duration_ms", 0)
            ws.error_message = result.get("error", "")
            db.commit()

            for run_data in result.get("agent_runs", []):
                try:
                    started = run_data.get("started_at")
                    completed = run_data.get("completed_at")
                    agent_run = WorkspaceAgentRun(
                        workspace_id=workspace_id,
                        agent_type=run_data.get("agent_type", ""),
                        status=run_data.get("status", ""),
                        duration_ms=run_data.get("duration_ms", 0),
                        llm_provider=run_data.get("llm_provider", ""),
                        llm_model=run_data.get("llm_model", ""),
                        input_tokens=run_data.get("input_tokens", 0),
                        output_tokens=run_data.get("output_tokens", 0),
                        input_summary=run_data.get("input_summary", ""),
                        output_result=json.dumps(run_data.get("output_result", {}), ensure_ascii=False, default=str),
                        error_message=run_data.get("error_message", ""),
                        retry_count=run_data.get("retry_count", 0),
                        # 评审 #5：持久化 prompt 指纹 + 注入拦截标记
                        prompt_hash=run_data.get("prompt_hash", ""),
                        prompt_injection_blocked=run_data.get("prompt_injection_blocked", False),
                        started_at=datetime.fromisoformat(started) if started else None,
                        completed_at=datetime.fromisoformat(completed) if completed else None,
                    )
                    db.add(agent_run)
                except Exception as e:
                    logger.error(f"持久化 agent_run 失败: {e}")
            db.commit()

            try:
                await experience_store.record_run(ws, result.get("agent_runs", []))
            except Exception as e:
                logger.error(f"经验记录失败（不影响主流程）: {e}")

        await event_bus.emit(workspace_id, {
            "id": f"evt-{int(datetime.utcnow().timestamp() * 1000)}-complete",
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "type": "info",
            "agentType": "system",
            "title": "工作间执行完成",
            "content": f"状态: {ws.status if ws else 'unknown'}, 耗时: {result.get('duration_ms', 0)}ms",
            "data": {
                "status": ws.status if ws else "unknown",
                "duration_ms": result.get("duration_ms", 0),
                "partial": result.get("partial", False),
            },
        })

    except Exception as e:
        logger.exception(f"工作间后台任务异常: {e}")
        ws = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if ws:
            ws.status = "failed"
            ws.error_message = str(e)
            db.commit()

        await event_bus.emit(workspace_id, {
            "id": f"evt-{int(datetime.utcnow().timestamp() * 1000)}-error",
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "type": "error",
            "agentType": "system",
            "title": "工作间执行失败",
            "content": str(e),
            "data": {"error": str(e)},
        })
    finally:
        db.close()


@router.get("/{workspace_id}/runs")
def get_workspace_runs(workspace_id: str, db: Session = Depends(_get_db)):
    runs = db.query(WorkspaceAgentRun).filter(
        WorkspaceAgentRun.workspace_id == workspace_id
    ).order_by(WorkspaceAgentRun.started_at).all()
    return [
        {
            "id": r.id,
            "agent_type": r.agent_type,
            "status": r.status,
            "duration_ms": r.duration_ms,
            "llm_provider": r.llm_provider,
            "llm_model": r.llm_model,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "error_message": r.error_message,
            "retry_count": r.retry_count,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]


@router.websocket("/{workspace_id}/ws")
async def workspace_websocket(websocket: WebSocket, workspace_id: str):
    await event_bus.connect(websocket, workspace_id)
    try:
        while True:
            data = await websocket.receive_text()
            await event_bus.handle_client_message(workspace_id, data)
    except WebSocketDisconnect:
        await event_bus.disconnect(websocket, workspace_id)


# ================================================================
#  发布队列
# ================================================================

@publish_router.post("/queue")
def create_publish_tasks(
    req: dict,
    db: Session = Depends(_get_db),
    current_user: User = Depends(require_current_user),
):
    ws = db.query(Workspace).filter(Workspace.workspace_id == req["workspace_id"]).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    platform_contents = json.loads(ws.platform_contents or "{}")
    tasks = []
    for platform in req.get("platforms", []):
        content = platform_contents.get(platform, {})
        task = PublishTask(
            workspace_id=req["workspace_id"],
            user_id=current_user.id,
            platform=platform,
            title=content.get("title", ""),
            content=content.get("content", ""),
            publish_url=PLATFORM_PUBLISH_URLS.get(platform, ""),
        )
        db.add(task)
        tasks.append(task)

    db.commit()
    for t in tasks:
        db.refresh(t)
    return [_to_publish_response(t) for t in tasks]


@publish_router.get("/tasks")
def list_publish_tasks(
    status: Optional[str] = None,
    db: Session = Depends(_get_db),
    current_user: User = Depends(require_current_user),
):
    query = db.query(PublishTask).filter(PublishTask.user_id == current_user.id)
    if status:
        query = query.filter(PublishTask.status == status)
    tasks = query.order_by(PublishTask.created_at.desc()).all()
    return [_to_publish_response(t) for t in tasks]


@publish_router.put("/tasks/{task_id}/status")
def update_publish_task_status(
    task_id: int,
    status: str,
    db: Session = Depends(_get_db),
    current_user: User = Depends(require_current_user),
):
    task = db.query(PublishTask).filter(
        PublishTask.id == task_id,
        PublishTask.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="发布任务不存在")
    if status not in ("pending", "copied", "published", "skipped"):
        raise HTTPException(status_code=400, detail="无效状态")

    task.status = status
    task.operated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "status": status}
