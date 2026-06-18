import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from pgvector.sqlalchemy import Vector
from sqlalchemy.sql import func
from app.models.base import Base

class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(50), index=True)
    external_id = Column(String(255), index=True)
    title = Column(String(255))
    company = Column(String(255))
    location = Column(String(255))
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    description = Column(Text)
    apply_url = Column(String(1024))
    embedding = Column(Vector(768))  # Gemini text-embedding-004 (768 dims)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

Index("ix_job_listings_embedding", JobListing.embedding, postgresql_using="hnsw", postgresql_with={"m": 16, "ef_construction": 64}, postgresql_ops={"embedding": "vector_cosine_ops"})


class JobScore(Base):
    __tablename__ = "job_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    listing_id = Column(UUID(as_uuid=True), ForeignKey("job_listings.id", ondelete="CASCADE"))
    match_score = Column(Integer)
    match_reason = Column(Text)
    skill_gaps = Column(ARRAY(String))
    salary_fit = Column(Boolean)
    location_fit = Column(Boolean)
    notified = Column(Boolean, default=False)
    scored_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'listing_id', name='uq_user_listing_score'),
    )
