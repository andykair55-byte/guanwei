"""Pydantic 数据模型"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Any

class UserBase(BaseModel):
    username: str
    nickname: str

class UserCreate(BaseModel):
    """注册请求 — spec-12 加密码强度和用户名校验"""
    username: str = Field(..., min_length=3, max_length=20, pattern=r'^[a-zA-Z0-9_]+$')
    nickname: str = Field(..., min_length=1, max_length=20)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        if not any(c.isalpha() for c in v):
            raise ValueError("密码必须包含至少一个字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含至少一个数字")
        return v

class UserLogin(BaseModel):
    """登录请求 — spec-12 只校验长度，不校验强度"""
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=1, max_length=128)

class UserResponse(UserBase):
    id: int
    avatar: str
    points: int
    rank: str
    is_admin: bool = False
    total_guesses: int
    correct_guesses: int
    created_at: datetime

    class Config:
        from_attributes = True

class MelonBase(BaseModel):
    title: str
    description: str
    category: str
    cover_image: Optional[str] = None

class MelonCreate(BaseModel):
    """创建瓜请求 — spec-12 加输入长度限制"""
    title: str = Field(..., max_length=100)
    description: str = Field(..., max_length=2000)
    category: str = Field(..., max_length=50)
    cover_image: Optional[str] = Field(default=None, max_length=500)

class MelonResponse(MelonBase):
    id: int
    creator_id: int
    result: Optional[bool] = None
    status: str
    reveal_time: Optional[datetime] = None
    participant_count: int
    true_count: int
    false_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class MelonListResponse(BaseModel):
    total: int
    items: List[MelonResponse]

class GuessCreate(BaseModel):
    melon_id: int
    choice: bool
    evidence_content: Optional[str] = Field(default=None, max_length=1000)

class GuessResponse(BaseModel):
    id: int
    melon_id: int
    choice: bool
    is_correct: Optional[bool] = None
    points_earned: int
    guessed_at: datetime
    
    class Config:
        from_attributes = True

class EvidenceResponse(BaseModel):
    id: int
    user_id: int
    user_nickname: str = ""
    user_avatar: str = ""
    melon_id: int
    content: str
    upvotes: int
    downvotes: int
    is_best: bool
    direction: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class EvidenceListResponse(BaseModel):
    best: Optional[EvidenceResponse] = None
    list: List[EvidenceResponse]

class PointsRecordResponse(BaseModel):
    id: int
    amount: int
    type: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class WorkspaceCreate(BaseModel):
    topic: str = Field(..., max_length=500)
    platform_order: List[str] = Field(default=["guanwei", "zhihu", "xiaohongshu"])
    title: Optional[str] = Field(default=None, max_length=200)


class WorkspaceRunRequest(BaseModel):
    strategy: str = Field(default="dag")
    custom_dag: Optional[dict] = None


class WorkspaceResponse(BaseModel):
    workspace_id: str
    topic: str
    title: str
    status: str
    strategy: str
    platform_order: List[str]
    draft: dict
    platform_contents: dict
    duration_ms: int
    error_message: str
    created_at: str
    updated_at: str


class PublishTaskRequest(BaseModel):
    workspace_id: str
    platforms: List[str]


class PublishTaskResponse(BaseModel):
    id: int
    workspace_id: str
    platform: str
    title: str
    content: str
    publish_url: str
    status: str
    created_at: str
    operated_at: Optional[str] = None
