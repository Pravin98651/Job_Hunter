from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class JobListingBase(BaseModel):
    title: str
    company: str
    location: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: str
    apply_url: HttpUrl
    source: str
    external_id: str

class JobListingCreate(JobListingBase):
    pass

class JobListingResponse(JobListingBase):
    id: UUID
    scraped_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
