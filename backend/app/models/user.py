import uuid
from sqlalchemy import Column, String, Integer, Boolean, ARRAY, DateTime
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
