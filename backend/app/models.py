from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, UniqueConstraint
from datetime import datetime
import enum
from app.database import Base


class StoryStatus(str, enum.Enum):
    pending = "pending"
    needs_revision = "needs_revision"
    approved = "approved"


class MediaType(str, enum.Enum):
    none = "none"
    image = "image"
    video = "video"
    audio = "audio"


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, nullable=True, index=True)
    title = Column(String(150), nullable=False)
    author_name = Column(String(100), nullable=False)
    category = Column(String(50), default="Geral")
    story_text = Column(Text, nullable=False)
    media_url = Column(String(500), nullable=True)
    media_type = Column(Enum(MediaType), default=MediaType.none)
    status = Column(Enum(StoryStatus), default=StoryStatus.pending)
    moderation_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True, index=True)  # soft delete: preenchido quando excluída


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


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("story_id", "emoji", "fingerprint_hash", name="uq_reactions_story_emoji_fingerprint"),
    )

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji = Column(String(8), nullable=False, index=True)
    fingerprint_hash = Column(String(64), nullable=False, index=True)
    ip_hash = Column(String(64), nullable=False, index=True)
    user_agent_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class StoryView(Base):
    __tablename__ = "story_views"
    __table_args__ = (
        UniqueConstraint("story_id", "visitor_hash", name="uq_story_views_story_visitor"),
    )

    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(Integer, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    visitor_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ReactionBlock(Base):
    __tablename__ = "reaction_blocks"

    id = Column(Integer, primary_key=True, index=True)
    fingerprint_hash = Column(String(64), nullable=True, index=True)
    ip_hash = Column(String(64), nullable=True, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True, index=True)


class AnonymousVisitor(Base):
    __tablename__ = "anonymous_visitors"

    id = Column(Integer, primary_key=True, index=True)
    visitor_hash = Column(String(64), unique=True, nullable=False, index=True)
    first_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LoggedUserPresence(Base):
    __tablename__ = "logged_user_presence"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, nullable=False, index=True)
    first_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class DailyVisit(Base):
    __tablename__ = "daily_visits"
    __table_args__ = (
        UniqueConstraint("visit_date", "visitor_hash", name="uq_daily_visits_date_visitor"),
    )

    id = Column(Integer, primary_key=True, index=True)
    visit_date = Column(String(10), nullable=False, index=True)
    visitor_hash = Column(String(64), nullable=False, index=True)
    source = Column(String(16), nullable=False, default="anonymous")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
