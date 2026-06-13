import asyncio
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
from app.schemas.jobs import JobListingCreate
from app.scrapers.linkedin import scrape_linkedin_jobs
from app.agents.llm_scorer import score_job_listing
from app.db.session import SessionLocal
from app.models.job import JobListing, JobScore
from app.services.dedup import is_duplicate

class AgentState(TypedDict):
    user_id: str
    query: str
    location: str
    raw_listings: List[JobListingCreate]
    scored_listings: List[dict]
    user_profile: dict

async def scrape_jobs(state: AgentState):
    print(f"Scraping jobs for {state['query']} in {state['location']}...")
    jobs = await scrape_linkedin_jobs(state["query"], state["location"], max_results=10)
    return {"raw_listings": jobs}

async def score_jobs(state: AgentState):
    print(f"Scoring {len(state.get('raw_listings', []))} listings...")
    
    user_profile = state.get("user_profile") or {
        "title": "AI Engineer",
        "skills": ["Python", "FastAPI", "React", "Postgres", "LLMs"],
        "experience_years": 3,
        "salary_expectation_min": 120000
    }
    
    db = SessionLocal()
    try:
        for job in state.get('raw_listings', []):
            if is_duplicate(db, job.description):
                print(f"Skipping duplicate: {job.title}")
                continue
                
            db_job = JobListing(
                source=job.source,
                external_id=job.external_id,
                title=job.title,
                company=job.company,
                location=job.location,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                description=job.description,
                apply_url=str(job.apply_url)
            )
            db.add(db_job)
            db.commit()
            db.refresh(db_job)
            
            score_result = score_job_listing(job.description, user_profile)
            
            db_score = JobScore(
                user_id=state["user_id"],
                listing_id=db_job.id,
                match_score=score_result.match_score,
                match_reason=score_result.match_reason,
                skill_gaps=score_result.skill_gaps,
                salary_fit=score_result.salary_fit,
                location_fit=score_result.location_fit
            )
            db.add(db_score)
            db.commit()
    finally:
        db.close()
    return {"scored_listings": []}

workflow = StateGraph(AgentState)
workflow.add_node("scrape", scrape_jobs)
workflow.add_node("score", score_jobs)

workflow.set_entry_point("scrape")
workflow.add_edge("scrape", "score")
workflow.add_edge("score", END)

orchestrator_app = workflow.compile()
