from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user_id
from uuid import UUID

router = APIRouter()

class UserCreate(BaseModel):
    id: Optional[UUID] = None
    email: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    min_salary: Optional[int] = None
    skills_required: Optional[List[str]] = []
    skills_nice: Optional[List[str]] = []
    job_type: Optional[str] = None

class UserUpdate(BaseModel):
    preferences: Optional[dict] = None
    resume_profile: Optional[dict] = None

@router.post("/")
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.email:
        db_user = db.query(User).filter(User.email == user_in.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    
    new_user = User(**user_in.model_dump(exclude_unset=True))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me")
def get_user(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me")
def update_user(user_in: UserUpdate, current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_in.preferences is not None:
        user.preferences = user_in.preferences
    if user_in.resume_profile is not None:
        user.resume_profile = user_in.resume_profile
        
    db.commit()
    db.refresh(user)
    return user
