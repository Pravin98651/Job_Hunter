import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class MockInterviewSession(Base):
    __tablename__ = "mock_interview_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    overall_score = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    qas = relationship("MockInterviewQA", back_populates="session", cascade="all, delete-orphan")


class MockInterviewQA(Base):
    __tablename__ = "mock_interview_qas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"), index=True)
    
    question = Column(Text, nullable=False)
    user_answer = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("MockInterviewSession", back_populates="qas")
