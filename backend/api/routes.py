"""API 路由定义"""
import logging
from typing import Literal
from pydantic import BaseModel, Field

from fastapi import APIRouter
from pipeline.orchestrator import orchestrator
from agents.moderator import moderator_agent
from agents.models import ModeratorInput

logger = logging.getLogger(__name__)

router = APIRouter()


class VerifyRequest(BaseModel):
    """求证请求"""
    content: str = Field(description="待验证的信息内容")
    type: Literal["text", "link"] = Field(default="text", description="内容类型")


class VerifyResponse(BaseModel):
    """求证响应"""
    success: bool
    result: dict | None = None
    error: str | None = None


class ModerateRequest(BaseModel):
    """内容审核请求"""
    text: str = Field(description="待审核的文本内容")


class ModerateResponse(BaseModel):
    """内容审核响应"""
    success: bool
    result: dict | None = None
    error: str | None = None


@router.post("/verify", response_model=VerifyResponse)
async def verify(request: VerifyRequest):
    """一键求证接口

    执行完整的信息验证流程：
    1. 内容审核
    2. 信息搜集
    3. 来源验证
    4. 深度分析
    """
    logger.info(f"Verify request: {request.content[:100]}")
    result = await orchestrator.run(request.content)

    if result.get("error"):
        return VerifyResponse(success=False, error=result["error"])

    return VerifyResponse(success=True, result=result)


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


from api.user_routes import router as user_router
from api.melon_routes import router as melon_router

router.include_router(user_router)
router.include_router(melon_router)
