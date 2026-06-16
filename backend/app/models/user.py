import uuid
from sqlalchemy import Column, String, Integer, Boolean, ARRAY, DateTime, ForeignKey, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True)
    job_title = Column(String(255))
    location = Column(String(255))
    min_salary = Column(Integer)
    skills_required = Column(ARRAY(String))
    skills_nice = Column(ARRAY(String))
    job_type = Column(String(50))
    match_threshold = Column(Integer, default=70)
    notify_email = Column(Boolean, default=False)
    notify_whatsapp = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resume_profile = Column(JSONB, nullable=True)
    preferences = Column(JSONB, nullable=True)

class UserDocument(Base):
    __tablename__ = "user_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename = Column(String(255))
    file_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    enabled = Column(Boolean, default=False)
    scrape_interval_hours = Column(Integer, default=6)
    min_score_threshold = Column(Integer, default=80)
    slack_webhook = Column(String(1024), nullable=True)
    telegram_webhook = Column(String(1024), nullable=True)
    email = Column(String(255), nullable=True)
    scrape_query = Column(String(255), default="AI Engineer")
    scrape_location = Column(String(255), default="Remote")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
