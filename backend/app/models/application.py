import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import Base


class ApplicationStatus(str, enum.Enum):
    """Kanban-style statuses for tracking job applications."""
    bookmarked = "bookmarked"
    applied = "applied"
    interviewing = "interviewing"
    rejected = "rejected"
    offer = "offer"


class ApplicationTrack(Base):
    """Tracks a user's application to a specific job listing."""
    __tablename__ = "application_tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    listing_id = Column(UUID(as_uuid=True), ForeignKey("job_listings.id"), unique=True)
    status = Column(
        SQLEnum(ApplicationStatus), default=ApplicationStatus.bookmarked, index=True
    )
    cover_letter = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
