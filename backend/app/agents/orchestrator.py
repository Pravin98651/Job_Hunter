"""
LangGraph Orchestration Pipeline
---------------------------------
Implements a two-node StateGraph:
  scrape  →  score  →  END

The `scrape` node runs all scrapers concurrently with asyncio.gather().
The `score` node deduplicates, embeds, AI-scores, and batch-commits results.

System design principles followed:
- SRP: scrape and score are separate, single-purpose nodes.
- Idempotency: external_id uniqueness checked before embedding; UniqueConstraint
  on (source, external_id) at the DB level guards against races.
- Observability: all phases emit structured log messages with timing.
- Graceful degradation: no hardcoded profile fallback — logs a clear warning
  and scores with empty context so jobs still appear for the user.
- Config-driven: max_per_source and timeout come from settings.
"""

import asyncio
import logging
import time
from typing import List, TypedDict

from sqlalchemy.exc import IntegrityError
from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.job import JobListing, JobScore
from app.agents.llm_scorer import score_job_listing
from app.schemas.jobs import JobListingCreate
from app.scrapers.glassdoor import scrape_glassdoor_jobs
from app.scrapers.indeed import scrape_indeed_jobs
from app.scrapers.linkedin import scrape_linkedin_jobs
from app.scrapers.remotive import scrape_remotive_jobs
from app.scrapers.wellfound import scrape_wellfound_jobs
from app.services.dedup import generate_embedding, is_duplicate

logger = logging.getLogger(__name__)


# ── State Schema ──────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    user_id: str
    query: str
    location: str
    raw_listings: List[JobListingCreate]
    scored_listings: List[dict]
    user_profile: dict


# ── Node: scrape ──────────────────────────────────────────────────────────────

async def scrape_jobs(state: AgentState) -> dict:
    """
    Concurrently scrapes all job sources.
    Each scraper is individually fault-tolerant via return_exceptions=True.
    """
    query = state["query"]
    location = state["location"]
    max_per_source = settings.SCRAPER_MAX_PER_SOURCE

    logger.info(
        "Scrape started",
        extra={"user_id": state["user_id"], "query": query, "location": location, "max_per_source": max_per_source},
    )
    t0 = time.perf_counter()

    results = await asyncio.gather(
        scrape_linkedin_jobs(query, location, max_results=max_per_source),
        scrape_indeed_jobs(query, location, max_results=max_per_source),
        scrape_glassdoor_jobs(query, location, max_results=max_per_source),
        scrape_wellfound_jobs(query, location, max_results=max_per_source),
        scrape_remotive_jobs(query, location, max_results=max_per_source),
        return_exceptions=True,
    )

    source_names = ["linkedin", "indeed", "glassdoor", "wellfound", "remotive"]
    all_jobs: List[JobListingCreate] = []
    for name, result in zip(source_names, results):
        if isinstance(result, list):
            logger.info(f"[scrape] {name}: {len(result)} listings fetched")
            all_jobs.extend(result)
        elif isinstance(result, Exception):
            logger.warning(f"[scrape] {name}: scraper failed — {result}")

    elapsed = round(time.perf_counter() - t0, 2)
    logger.info(
        f"Scrape completed: {len(all_jobs)} total listings in {elapsed}s",
        extra={"user_id": state["user_id"]},
    )
    return {"raw_listings": all_jobs}


# ── Node: score ───────────────────────────────────────────────────────────────

async def score_jobs(state: AgentState) -> dict:
    """
    Deduplicates, embeds, AI-scores, and batch-commits all scraped listings.

    Idempotency strategy (layered):
      1. external_id pre-check — fast DB lookup before any embedding call.
      2. Vector similarity dedup — semantic dedup via pgvector cosine distance.
      3. UniqueConstraint(source, external_id) at DB level — last-resort guard.
      4. UniqueConstraint(user_id, listing_id) on job_scores — prevents double scoring.
    """
    raw_listings = state.get("raw_listings", [])
    logger.info(
        f"Score started: {len(raw_listings)} listings to process",
        extra={"user_id": state["user_id"]},
    )
    t0 = time.perf_counter()

    # Resolve user profile — never fall back to a hardcoded persona
    user_profile = state.get("user_profile") or {}
    if not user_profile:
        logger.warning(
            "No user_profile in state. Jobs will be scored without profile context — "
            "keyword fallback scorer will be used. Upload a resume to improve results.",
            extra={"user_id": state["user_id"]},
        )

    db = SessionLocal()
    try:
        committed = 0
        skipped_duplicate = 0
        skipped_error = 0

        for job in raw_listings:
            # ── Layer 1: external_id pre-check (fast, no embedding needed) ──
            existing_listing = (
                db.query(JobListing)
                .filter(
                    JobListing.source == job.source,
                    JobListing.external_id == job.external_id,
                )
                .first()
            )
            if existing_listing:
                # Listing already in DB — still score it for this user if not yet scored
                existing_score = (
                    db.query(JobScore)
                    .filter(
                        JobScore.listing_id == existing_listing.id,
                        JobScore.user_id == state["user_id"],
                    )
                    .first()
                )
                if existing_score:
                    logger.debug(f"Skipping already-scored job: {job.title} @ {job.company}")
                    skipped_duplicate += 1
                    continue
                # Score the existing listing for this user
                try:
                    score_result = score_job_listing(job.description, user_profile)
                    db_score = JobScore(
                        user_id=state["user_id"],
                        listing_id=existing_listing.id,
                        match_score=score_result.match_score,
                        match_reason=score_result.match_reason,
                        skill_gaps=score_result.skill_gaps,
                        salary_fit=score_result.salary_fit,
                        location_fit=score_result.location_fit,
                    )
                    db.add(db_score)
                    db.flush()
                    committed += 1
                except Exception as e:
                    logger.error(f"Failed to score existing listing {job.title}: {e}")
                    db.rollback()
                    skipped_error += 1
                continue

            # ── Layer 2: Semantic dedup via pgvector ──
            if is_duplicate(db, job.description):
                logger.debug(f"Semantic duplicate skipped: {job.title} @ {job.company}")
                skipped_duplicate += 1
                continue

            # ── Insert new listing + score ──
            try:
                embedding = generate_embedding(job.description)
                db_job = JobListing(
                    source=job.source,
                    external_id=job.external_id,
                    title=job.title,
                    company=job.company,
                    location=job.location,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    description=job.description,
                    apply_url=str(job.apply_url),
                    embedding=embedding if any(v != 0.0 for v in embedding) else None,
                )
                db.add(db_job)
                db.flush()  # Assign ID without committing

                score_result = score_job_listing(job.description, user_profile)
                db_score = JobScore(
                    user_id=state["user_id"],
                    listing_id=db_job.id,
                    match_score=score_result.match_score,
                    match_reason=score_result.match_reason,
                    skill_gaps=score_result.skill_gaps,
                    salary_fit=score_result.salary_fit,
                    location_fit=score_result.location_fit,
                )
                db.add(db_score)
                db.flush()
                committed += 1

            except IntegrityError:
                # ── Layer 3: Race condition guard — another request beat us ──
                db.rollback()
                logger.warning(f"IntegrityError on {job.title} @ {job.company} — race condition, safe to skip")
                skipped_duplicate += 1
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to process {job.title} @ {job.company}: {e}", exc_info=True)
                skipped_error += 1

        # Single batch commit
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Batch commit failed: {e}", exc_info=True)

    finally:
        db.close()

    elapsed = round(time.perf_counter() - t0, 2)
    logger.info(
        f"Score completed in {elapsed}s — "
        f"committed={committed}, skipped_duplicate={skipped_duplicate}, skipped_error={skipped_error}",
        extra={"user_id": state["user_id"]},
    )
    return {"scored_listings": []}


# ── Compile the graph ─────────────────────────────────────────────────────────

workflow = StateGraph(AgentState)
workflow.add_node("scrape", scrape_jobs)
workflow.add_node("score", score_jobs)
workflow.set_entry_point("scrape")
workflow.add_edge("scrape", "score")
workflow.add_edge("score", END)

orchestrator_app = workflow.compile()
