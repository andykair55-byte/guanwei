"""业务逻辑异常

服务层抛出业务异常，由路由层 / 全局异常处理器捕获并转换为 HTTP 响应。
避免服务层直接依赖 fastapi.HTTPException，保持服务层与 Web 层解耦。
"""


class BusinessError(Exception):
    """业务逻辑异常基类"""

    def __init__(self, message: str, code: str = "BUSINESS_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(BusinessError):
    """资源不存在异常（对应 HTTP 404）"""

    def __init__(self, resource: str, id: int | str | None = None):
        message = f"{resource}不存在" if id is None else f"{resource}#{id} 不存在"
        super().__init__(message, "NOT_FOUND")


class ConflictError(BusinessError):
    """资源冲突异常（对应 HTTP 409）"""

    def __init__(self, message: str):
        super().__init__(message, "CONFLICT")


class ValidationError(BusinessError):
    """业务参数校验失败异常（对应 HTTP 400）"""

    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")


class AuthenticationError(BusinessError):
    """认证失败异常（对应 HTTP 401）"""

    def __init__(self, message: str = "认证失败"):
        super().__init__(message, "AUTHENTICATION_ERROR")
