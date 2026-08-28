from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models import StoryStatus, MediaType, CommentStatus


# ============ STORY SCHEMAS ============
class StoryCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=150, description="Título da história")
    author_name: str = Field(..., min_length=2, max_length=100, description="Nome do autor")
    category: str = Field(default="Geral", description="Categoria/Tag")
    story_text: str = Field(..., min_length=10, description="Texto da história")
    media_url: Optional[str] = Field(None, max_length=500, description="URL da mídia")
    media_type: MediaType = Field(default=MediaType.none)


class StoryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=150)
    author_name: Optional[str] = Field(None, min_length=2, max_length=100)
    category: Optional[str] = None
    story_text: Optional[str] = Field(None, min_length=10)
    media_url: Optional[str] = Field(None, max_length=500)
    media_type: Optional[MediaType] = None
    status: Optional[StoryStatus] = None
    moderation_note: Optional[str] = Field(None, max_length=1000)


class StoryResponse(BaseModel):
    id: int
    author_id: Optional[int]
    title: str
    author_name: str
    category: str
    story_text: str
    media_url: Optional[str]
    media_type: str
    status: str
    moderation_note: Optional[str]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=10, max_length=2000)


class CommentUpdate(BaseModel):
    comment_text: Optional[str] = Field(None, min_length=10, max_length=2000)
    status: Optional[CommentStatus] = None
    moderation_note: Optional[str] = Field(None, max_length=1000)


class CommentResponse(BaseModel):
    id: int
    story_id: int
    author_id: int
    author_name: str
    comment_text: str
    status: str
    moderation_note: Optional[str]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ USER SCHEMAS ============
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


# ============ AUTH SCHEMAS ============
class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ REACTION SCHEMAS ============
class ReactionToggleRequest(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=8)


class ReactionSummaryResponse(BaseModel):
    story_id: int
    totals: dict[str, int]
    my_reactions: list[str]
    total_count: int
    changed_emoji: Optional[str] = None
    changed_emoji_reacted: Optional[bool] = None


class ReactionBlockCreate(BaseModel):
    fingerprint_hash: Optional[str] = Field(None, min_length=64, max_length=64)
    ip_hash: Optional[str] = Field(None, min_length=64, max_length=64)
    reason: Optional[str] = Field(None, max_length=255)
    hours: int = Field(default=24, ge=1, le=720)


class PlatformCountersResponse(BaseModel):
    unique_anonymous_visitors: int
    active_logged_users: int
    tracked_logged_users: int
    active_window_minutes: int
    visits_today: int
    visits_last_7_days: int
    visits_last_30_days: int
    daily_visits_last_7_days: list[dict[str, int | str]]
