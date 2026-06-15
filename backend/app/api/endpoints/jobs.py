from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import JobListing, JobScore
from app.schemas.jobs import JobListingResponse
from app.agents.orchestrator import orchestrator_app
from pydantic import BaseModel
from typing import List

router = APIRouter()

class JobSearchRequest(BaseModel):
    query: str
    location: str
    user_id: str
    user_profile: dict | None = None

@router.get("/", response_model=List[dict])
def get_scored_jobs(db: Session = Depends(get_db), skip: int = 0, limit: int = 50):
    """
    Returns the latest jobs and their AI-generated scores.
    """
    records = db.query(JobScore, JobListing).join(JobListing, JobScore.listing_id == JobListing.id).order_by(JobScore.scored_at.desc()).offset(skip).limit(limit).all()
    results = []
    for score, job in records:
        results.append({
            "id": str(job.id),
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salaryMin": job.salary_min,
            "salaryMax": job.salary_max,
            "source": job.source,
            "description": job.description,
            "matchScore": score.match_score,
            "matchReason": score.match_reason,
            "skillGaps": score.skill_gaps,
            "applyUrl": str(job.apply_url)
        })
    return results

@router.post("/search")
async def trigger_job_search(request: JobSearchRequest):
    """
    Triggers the LangGraph orchestrator to scrape and score new jobs.
    """
    state_input = {
        "user_id": request.user_id,
        "query": request.query,
        "location": request.location,
        "user_profile": request.user_profile,
        "raw_listings": [],
        "scored_listings": []
    }
    
    await orchestrator_app.ainvoke(state_input)
    return {"status": "Job search pipeline completed successfully. Please refresh the page to see your new jobs!"}
