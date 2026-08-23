from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models import StoryStatus, MediaType


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


class StoryResponse(BaseModel):
    id: int
    title: str
    author_name: str
    category: str
    story_text: str
    media_url: Optional[str]
    media_type: str
    status: str
    created_at: datetime
    updated_at: datetime

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
