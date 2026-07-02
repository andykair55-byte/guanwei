"""Pydantic 数据模型"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    username: str
    nickname: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

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

class MelonCreate(MelonBase):
    pass

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
    evidence_content: Optional[str] = None

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
