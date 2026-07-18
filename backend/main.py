"""FastAPI 主入口"""
import logging
import os
import uuid
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.routes import router as api_router
from database import Base, engine, SessionLocal
from services.cache import redis_client, REDIS_AVAILABLE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

Base.metadata.create_all(bind=engine)

# 初始化种子数据
from seed import seed_database
from seed_users import seed_extended_users, seed_more_melons
db = SessionLocal()
try:
    seed_database(db)
    user_ids = seed_extended_users(db)
    if user_ids:
        seed_more_melons(db, user_ids)
finally:
    db.close()


# === 统一错误响应格式 ===


class ErrorResponse(BaseModel):
    """统一错误响应格式"""
    code: int
    message: str
    details: str | None = None


def create_error_response(code: int, message: str, details: str | None = None) -> JSONResponse:
    """创建统一错误响应"""
    return JSONResponse(
        status_code=code,
        content=ErrorResponse(code=code, message=message, details=details).model_dump()
    )


app = FastAPI(
    title="见微 API",
    version="1.0.0",
    description="信息验证与内容审核 API",
)


# === 速率限制初始化 ===

@app.on_event("startup")
async def startup():
    if REDIS_AVAILABLE and redis_client:
        from fastapi_limiter import FastAPILimiter
        await FastAPILimiter.init(redis_client)
        logging.info("速率限制器已初始化（Redis 后端）")
    else:
        logging.warning("Redis 不可用，速率限制器未启用")

    # spec-11: 启动 LLM 健康检查后台任务
    from services.llm import llm_service
    await llm_service.start_health_check()
    logging.info("LLM 健康检查后台任务已启动")


# === 全局异常处理器 ===


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """处理 HTTP 异常"""
    if isinstance(exc.detail, dict):
        # 结构化错误（如 409 DUPLICATE_SUBMIT），保留原始 detail 透传
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    return create_error_response(
        code=exc.status_code,
        message=exc.detail or "请求错误",
        details=str(exc) if exc.detail else None
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """处理参数错误"""
    return create_error_response(
        code=400,
        message="参数错误",
        details=str(exc)
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理未捕获异常"""
    logging.error(f"未捕获异常: {exc}", exc_info=True)
    return create_error_response(
        code=500,
        message="服务器内部错误",
        details=str(exc) if app.debug else None
    )


# === 中间件 ===

# spec-12: CORS 白名单（从环境变量读取）
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",")
CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS if o.strip()]
if not CORS_ORIGINS:
    if os.getenv("DEV_MODE", "false").lower() == "true":
        CORS_ORIGINS = ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"]
    else:
        raise RuntimeError(
            "生产环境必须配置 CORS_ORIGINS 环境变量！\n"
            "请设置 CORS_ORIGINS 为允许的前端域名（逗号分隔），例如：\n"
            "  CORS_ORIGINS=https://example.com,https://www.example.com\n"
            "如果您正在开发环境中运行，请设置 DEV_MODE=true 以使用默认白名单。"
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# spec-12: 安全头中间件
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """添加 OWASP 推荐的安全响应头 + 请求 ID 用于日志追踪"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Request-ID"] = str(uuid.uuid4())
    return response


app.include_router(api_router, prefix="/api/v1")


# === 请求指标中间件 ===

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """记录每次请求的指标（供管理后台运维面板使用）"""
    import time as _time
    start = _time.time()
    response = await call_next(request)
    duration_ms = (_time.time() - start) * 1000

    # 只记录 API 请求的指标
    if request.url.path.startswith("/api/"):
        from api.admin_routes import record_request
        record_request(response.status_code, request.url.path, duration_ms)

    return response


@app.get("/")
async def root():
    return {"message": "欢迎使用见微 API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    """健康检查端点（不需要认证，供 docker-compose healthcheck 与运维探测使用）"""
    from sqlalchemy import text as _sql_text
    from database import engine
    from services.cache import REDIS_AVAILABLE

    # 实时探测数据库连通性
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(_sql_text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok",
        "database": "connected" if db_ok else "disconnected",
        "redis": "connected" if REDIS_AVAILABLE else "disconnected",
    }
