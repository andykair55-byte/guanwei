"""FastAPI 主入口"""
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.routes import router as api_router
from database import Base, engine, SessionLocal

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


# === 全局异常处理器 ===


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """处理 HTTP 异常"""
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


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
