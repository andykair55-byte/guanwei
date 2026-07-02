"""管理后台 API — Production Grade

功能：
- JWT 鉴权 + admin 角色校验
- 操作审计日志（所有写操作自动记录）
- 分页 / 排序 / 批量操作 / CSV 导出
- Pipeline 运行历史 + 超时控制
- 运维监控（CPU/内存/QPS/错误率）
"""
import csv
import io
import json
import logging
import os
import time
from collections import deque
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import (
    User, Melon, Guess, Evidence, PointsRecord, Report,
    AuditLog, PipelineRun, EvidenceChain,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["管理后台"], dependencies=[Depends(require_admin)])


# ================================================================
#  Request / Response Models
# ================================================================

class RevealMelonRequest(BaseModel):
    result: bool = Field(description="瓜的结果：true=属实, false=虚假")

class BatchRevealRequest(BaseModel):
    melon_ids: List[int]
    result: bool

class BatchDeleteMelonsRequest(BaseModel):
    melon_ids: List[int]

class AdjustPointsRequest(BaseModel):
    amount: int = Field(description="积分变动量（正数加，负数减）")
    reason: str = Field(default="管理员调整", description="调整原因")

class UpdateMelonRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None

class SetAdminRequest(BaseModel):
    user_id: int
    is_admin: bool


# ================================================================
#  Audit Log Helper
# ================================================================

def _audit(
    db: Session,
    admin: User,
    action: str,
    target_type: str,
    target_id: Optional[int] = None,
    detail: dict = None,
    ip: str = "",
):
    """写入审计日志"""
    log = AuditLog(
        admin_id=admin.id,
        admin_name=admin.nickname,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=json.dumps(detail or {}, ensure_ascii=False),
        ip_address=ip,
    )
    db.add(log)
    db.flush()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


# ================================================================
#  Request Metrics (in-memory ring buffer for QPS / error tracking)
# ================================================================

_metrics_lock = __import__("threading").Lock()
_request_log: deque = deque(maxlen=5000)  # (timestamp, status_code, path, duration_ms)
_start_time = time.time()


def record_request(status_code: int, path: str, duration_ms: float):
    """记录一次请求（由中间件调用）"""
    with _metrics_lock:
        _request_log.append((time.time(), status_code, path, duration_ms))


def get_request_stats(window_seconds: int = 300) -> dict:
    """获取最近 N 秒的请求统计"""
    now = time.time()
    cutoff = now - window_seconds
    total = 0
    errors = 0
    path_counts: dict = {}
    durations: list = []

    with _metrics_lock:
        for ts, code, path, dur in _request_log:
            if ts < cutoff:
                continue
            total += 1
            if code >= 400:
                errors += 1
            path_counts[path] = path_counts.get(path, 0) + 1
            durations.append(dur)

    avg_latency = sum(durations) / len(durations) if durations else 0
    qps = total / window_seconds if window_seconds > 0 else 0

    return {
        "window_seconds": window_seconds,
        "total_requests": total,
        "error_count": errors,
        "error_rate": round(errors / total, 4) if total > 0 else 0,
        "qps": round(qps, 2),
        "avg_latency_ms": round(avg_latency, 1),
        "top_paths": dict(sorted(path_counts.items(), key=lambda x: -x[1])[:10]),
    }


# ================================================================
#  用户管理
# ================================================================

@router.get("/users")
def list_users(
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
):
    """列出用户（分页 + 排序 + 搜索）"""
    query = db.query(User)
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) | (User.nickname.ilike(f"%{search}%"))
        )

    total = query.count()

    # 排序
    sort_col = getattr(User, sort_by, User.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    users = query.offset((page - 1) * size).limit(size).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        "items": [
            {
                "id": u.id,
                "username": u.username,
                "nickname": u.nickname,
                "avatar": u.avatar,
                "points": u.points,
                "rank": u.rank,
                "is_admin": getattr(u, "is_admin", False),
                "total_guesses": u.total_guesses,
                "correct_guesses": u.correct_guesses,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.delete("/users/{user_id}")
def delete_user(user_id: int, request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """注销用户（软删除）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if getattr(user, "is_admin", False):
        raise HTTPException(status_code=400, detail="不能注销管理员")

    detail = {"username": user.username, "nickname": user.nickname, "points_before": user.points}

    db.query(Evidence).filter(Evidence.user_id == user_id).delete()
    db.query(Guess).filter(Guess.user_id == user_id).delete()
    db.query(PointsRecord).filter(PointsRecord.user_id == user_id).delete()

    user.nickname = f"[已注销]{user.username}"
    user.points = 0
    user.total_guesses = 0
    user.correct_guesses = 0
    user.rank = "吃瓜群众"

    _audit(db, admin, "delete_user", "user", user_id, detail, _client_ip(request))
    db.commit()
    return {"success": True, "message": f"用户 {user.username} 已注销"}


@router.put("/users/{user_id}/points")
def adjust_points(
    user_id: int,
    req: AdjustPointsRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """管理员调整用户积分"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    old_points = user.points
    user.points += req.amount
    record = PointsRecord(
        user_id=user.id, amount=req.amount, type="admin_adjust", description=req.reason,
    )
    db.add(record)

    _audit(db, admin, "adjust_points", "user", user_id,
           {"points_before": old_points, "points_after": user.points, "amount": req.amount, "reason": req.reason},
           _client_ip(request))
    db.commit()
    return {"success": True, "points": user.points, "amount": req.amount}


@router.put("/users/{user_id}/set-admin")
def set_admin_role(
    user_id: int,
    req: SetAdminRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """设置/取消管理员权限"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_admin = req.is_admin
    _audit(db, admin, "set_admin", "user", user_id, {"is_admin": req.is_admin}, _client_ip(request))
    db.commit()
    return {"success": True, "is_admin": user.is_admin}


@router.get("/users/export")
def export_users_csv(db: Session = Depends(get_db)):
    """导出用户数据 CSV"""
    users = db.query(User).order_by(User.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "用户名", "昵称", "积分", "段位", "管理员", "猜测数", "正确数", "注册时间"])
    for u in users:
        writer.writerow([u.id, u.username, u.nickname, u.points, u.rank,
                         getattr(u, "is_admin", False), u.total_guesses, u.correct_guesses,
                         u.created_at.isoformat() if u.created_at else ""])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=users_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )


# ================================================================
#  瓜管理
# ================================================================

@router.get("/melons")
def list_melons_admin(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
):
    """列出瓜（分页 + 排序 + 筛选）"""
    query = db.query(Melon)
    if status:
        query = query.filter(Melon.status == status)
    if category and category != "全部":
        query = query.filter(Melon.category == category)

    total = query.count()

    sort_col = getattr(Melon, sort_by, Melon.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    melons = query.offset((page - 1) * size).limit(size).all()

    items = []
    for m in melons:
        creator = db.query(User).filter(User.id == m.creator_id).first()
        items.append({
            "id": m.id, "title": m.title, "description": m.description,
            "cover_image": m.cover_image, "category": m.category,
            "creator_id": m.creator_id, "creator_name": creator.nickname if creator else "未知",
            "result": m.result, "status": m.status,
            "reveal_time": m.reveal_time.isoformat() if m.reveal_time else None,
            "participant_count": m.participant_count,
            "true_count": m.true_count, "false_count": m.false_count,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return {"total": total, "page": page, "size": size, "pages": (total + size - 1) // size, "items": items}


@router.put("/melons/{melon_id}")
def update_melon(melon_id: int, req: UpdateMelonRequest, request: Request,
                 admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """管理员编辑瓜"""
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")

    changes = {}
    for field in ["title", "description", "category", "cover_image", "status"]:
        val = getattr(req, field, None)
        if val is not None:
            changes[field] = {"before": getattr(melon, field), "after": val}
            setattr(melon, field, val)

    _audit(db, admin, "update_melon", "melon", melon_id, changes, _client_ip(request))
    db.commit()
    return {"success": True, "melon_id": melon.id}


@router.put("/melons/{melon_id}/reveal")
def reveal_melon(melon_id: int, req: RevealMelonRequest, request: Request,
                 admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """管理员揭瓜"""
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")
    if melon.status == "revealed":
        raise HTTPException(status_code=400, detail="该瓜已揭晓")

    melon.result = req.result
    melon.status = "revealed"
    melon.reveal_time = datetime.utcnow()

    settled = 0
    guesses = db.query(Guess).filter(Guess.melon_id == melon_id).all()
    for guess in guesses:
        is_correct = guess.choice == req.result
        guess.is_correct = is_correct
        if is_correct and guess.points_earned == 0:
            guess.points_earned = 30
            user = db.query(User).filter(User.id == guess.user_id).first()
            if user:
                user.correct_guesses += 1
                user.points += 30
                db.add(PointsRecord(user_id=user.id, amount=30, type="guess_correct",
                                    description=f"猜对「{melon.title[:20]}」"))
            settled += 1

    _audit(db, admin, "reveal_melon", "melon", melon_id,
           {"result": req.result, "settled_guesses": settled}, _client_ip(request))
    db.commit()
    return {"success": True, "message": f"瓜 #{melon_id} 已揭晓，结算 {settled} 条猜测"}


@router.post("/melons/batch-reveal")
def batch_reveal_melons(req: BatchRevealRequest, request: Request,
                        admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """批量揭瓜"""
    results = []
    for mid in req.melon_ids:
        melon = db.query(Melon).filter(Melon.id == mid).first()
        if not melon or melon.status == "revealed":
            results.append({"id": mid, "success": False, "reason": "不存在或已揭晓"})
            continue
        melon.result = req.result
        melon.status = "revealed"
        melon.reveal_time = datetime.utcnow()
        results.append({"id": mid, "success": True})

    _audit(db, admin, "batch_reveal", "melon", None,
           {"melon_ids": req.melon_ids, "result": req.result, "count": len(req.melon_ids)}, _client_ip(request))
    db.commit()
    return {"success": True, "results": results}


@router.post("/melons/batch-delete")
def batch_delete_melons(req: BatchDeleteMelonsRequest, request: Request,
                        admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """批量删除瓜"""
    deleted = []
    for mid in req.melon_ids:
        melon = db.query(Melon).filter(Melon.id == mid).first()
        if not melon:
            continue
        db.query(Evidence).filter(Evidence.melon_id == mid).delete()
        db.query(Guess).filter(Guess.melon_id == mid).delete()
        report = db.query(Report).filter(Report.melon_id == mid).first()
        if report:
            db.query(EvidenceChain).filter(EvidenceChain.report_id == report.id).delete()
            db.delete(report)
        db.delete(melon)
        deleted.append(mid)

    _audit(db, admin, "batch_delete", "melon", None, {"deleted_ids": deleted}, _client_ip(request))
    db.commit()
    return {"success": True, "deleted": deleted, "count": len(deleted)}


@router.delete("/melons/{melon_id}")
def delete_melon(melon_id: int, request: Request,
                 admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """删除单个瓜"""
    melon = db.query(Melon).filter(Melon.id == melon_id).first()
    if not melon:
        raise HTTPException(status_code=404, detail="瓜不存在")

    _audit(db, admin, "delete_melon", "melon", melon_id,
           {"title": melon.title, "status": melon.status}, _client_ip(request))

    db.query(Evidence).filter(Evidence.melon_id == melon_id).delete()
    db.query(Guess).filter(Guess.melon_id == melon_id).delete()
    report = db.query(Report).filter(Report.melon_id == melon_id).first()
    if report:
        db.query(EvidenceChain).filter(EvidenceChain.report_id == report.id).delete()
        db.delete(report)
    db.delete(melon)
    db.commit()
    return {"success": True, "message": f"瓜 #{melon_id} 已删除"}


@router.get("/melons/export")
def export_melons_csv(db: Session = Depends(get_db)):
    """导出瓜数据 CSV"""
    melons = db.query(Melon).order_by(Melon.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "标题", "分类", "状态", "结果", "参与人数", "真", "假", "创建时间"])
    for m in melons:
        result_str = "属实" if m.result is True else ("虚假" if m.result is False else "未揭")
        writer.writerow([m.id, m.title, m.category, m.status, result_str,
                         m.participant_count, m.true_count, m.false_count,
                         m.created_at.isoformat() if m.created_at else ""])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=melons_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )


# ================================================================
#  审计日志
# ================================================================

@router.get("/audit-logs")
def list_audit_logs(
    page: int = 1,
    size: int = 30,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    admin_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """查询审计日志"""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if admin_name:
        query = query.filter(AuditLog.admin_name.ilike(f"%{admin_name}%"))

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        "items": [
            {
                "id": log.id,
                "admin_id": log.admin_id,
                "admin_name": log.admin_name,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "detail": json.loads(log.detail) if log.detail else {},
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


# ================================================================
#  Pipeline 运行历史
# ================================================================

@router.get("/pipeline/runs")
def list_pipeline_runs(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """查询 Pipeline 运行历史"""
    query = db.query(PipelineRun)
    if status:
        query = query.filter(PipelineRun.status == status)
    total = query.count()
    runs = query.order_by(PipelineRun.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
        "items": [
            {
                "id": r.id,
                "pipeline_id": r.pipeline_id,
                "input_content": r.input_content[:200] if r.input_content else "",
                "status": r.status,
                "duration_ms": r.duration_ms,
                "error_message": r.error_message,
                "node_results": json.loads(r.node_results) if r.node_results else {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in runs
        ],
    }


@router.get("/pipeline/runs/{pipeline_id}")
def get_pipeline_run(pipeline_id: str, db: Session = Depends(get_db)):
    """获取单次 Pipeline 运行详情（含完整事件日志）"""
    run = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="运行记录不存在")
    return {
        "id": run.id,
        "pipeline_id": run.pipeline_id,
        "input_content": run.input_content,
        "status": run.status,
        "duration_ms": run.duration_ms,
        "error_message": run.error_message,
        "node_results": json.loads(run.node_results) if run.node_results else {},
        "event_log": json.loads(run.event_log) if run.event_log else [],
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }


@router.post("/pipeline/runs/{pipeline_id}/retry")
async def retry_pipeline_run(pipeline_id: str):
    """重试一次 Pipeline 运行（返回原始输入内容供前端重新提交）"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        run = db.query(PipelineRun).filter(PipelineRun.pipeline_id == pipeline_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="运行记录不存在")
        return {"success": True, "input_content": run.input_content}
    finally:
        db.close()


# ================================================================
#  运维监控
# ================================================================

@router.get("/ops/health")
def system_health(db: Session = Depends(get_db)):
    """系统健康状态（CPU / 内存 / 磁盘 / 运行时间 / 请求统计）"""
    uptime = time.time() - _start_time

    # 系统资源 — 尽量不依赖 psutil
    try:
        import psutil
        proc = psutil.Process(os.getpid())
        mem = proc.memory_info()
        cpu_pct = proc.cpu_percent(interval=0.1)
        mem_mb = round(mem.rss / 1024 / 1024, 1)
    except ImportError:
        cpu_pct = -1  # psutil 未安装
        mem_mb = -1

    # 请求统计
    stats_5min = get_request_stats(300)
    stats_1hour = get_request_stats(3600)

    # 数据库连接数
    db_table_counts = {
        "users": db.query(func.count(User.id)).scalar() or 0,
        "melons": db.query(func.count(Melon.id)).scalar() or 0,
        "guesses": db.query(func.count(Guess.id)).scalar() or 0,
        "evidences": db.query(func.count(Evidence.id)).scalar() or 0,
        "pipeline_runs": db.query(func.count(PipelineRun.id)).scalar() or 0,
        "audit_logs": db.query(func.count(AuditLog.id)).scalar() or 0,
    }

    return {
        "uptime_seconds": round(uptime),
        "uptime_display": _format_uptime(uptime),
        "system": {
            "cpu_percent": cpu_pct,
            "memory_mb": mem_mb,
            "python_version": os.sys.version.split()[0] if hasattr(os, "sys") else "unknown",
        },
        "requests_5min": stats_5min,
        "requests_1hour": stats_1hour,
        "database": db_table_counts,
    }


@router.get("/ops/request-log")
def recent_request_log(limit: int = 50):
    """最近的请求日志"""
    items = []
    with _metrics_lock:
        recent = list(_request_log)[-limit:]
    for ts, code, path, dur in reversed(recent):
        items.append({
            "timestamp": datetime.fromtimestamp(ts).isoformat(),
            "status_code": code,
            "path": path,
            "duration_ms": round(dur, 1),
        })
    return {"items": items}


# ================================================================
#  LLM 管理（保留，加鉴权）
# ================================================================

@router.get("/llm/providers")
def list_providers():
    """列出模型提供商"""
    from services.llm import llm_service
    return {"current": llm_service.primary_provider, "providers": llm_service.list_available_providers()}


@router.post("/llm/set-provider")
def set_provider(request: Request, provider: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """切换模型提供商"""
    from services.llm import llm_service
    from pydantic import BaseModel as BM

    class Req(BM):
        provider: str

    try:
        llm_service.set_primary_provider(provider)
        _audit(db, admin, "set_llm_provider", "llm", None, {"provider": provider}, _client_ip(request))
        db.commit()
        return {"success": True, "current": provider}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================================================================
#  Helpers
# ================================================================

def _format_uptime(seconds: float) -> str:
    d = int(seconds // 86400)
    h = int((seconds % 86400) // 3600)
    m = int((seconds % 3600) // 60)
    parts = []
    if d: parts.append(f"{d}天")
    if h: parts.append(f"{h}时")
    parts.append(f"{m}分")
    return " ".join(parts)
