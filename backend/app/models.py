from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from datetime import datetime
import enum
from app.database import Base


class StoryStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class MediaType(str, enum.Enum):
    none = "none"
    image = "image"
    video = "video"


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    author_name = Column(String(100), nullable=False)
    category = Column(String(50), default="Geral")
    story_text = Column(Text, nullable=False)
    media_url = Column(String(500), nullable=True)
    media_type = Column(Enum(MediaType), default=MediaType.none)
    status = Column(Enum(StoryStatus), default=StoryStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    role = Column(String(20), default="moderator")  # 'admin', 'moderator'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
