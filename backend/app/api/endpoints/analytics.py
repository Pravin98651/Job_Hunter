"""
Analytics Dashboard Endpoints
------------------------------
Aggregated metrics powering the frontend analytics dashboard:
score trends, skill gaps, pipeline funnel, and job-source breakdown.
"""

from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.job import JobListing, JobScore
from app.models.application import ApplicationTrack, ApplicationStatus
from app.api.deps import get_current_user_id
from uuid import UUID

router = APIRouter()


@router.get("/score-trends")
def get_score_trends(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Daily average match scores over time.

    Groups JobScore records by the date portion of `scored_at` and returns
    the average match_score and record count for each day, ordered
    chronologically.
    """
    rows = (
        db.query(
            cast(JobScore.scored_at, Date).label("date"),
            func.round(func.avg(JobScore.match_score)).label("avg_score"),
            func.count(JobScore.id).label("count"),
        )
        .filter(JobScore.user_id == current_user_id)
        .group_by(cast(JobScore.scored_at, Date))
        .order_by(cast(JobScore.scored_at, Date))
        .all()
    )

    return [
        {
            "date": str(row.date),
            "avgScore": int(row.avg_score),
            "count": row.count,
        }
        for row in rows
    ]


@router.get("/skill-gaps")
def get_skill_gaps(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Most frequent skill gaps across all scored jobs.

    Flattens the `skill_gaps` ARRAY column from every JobScore row,
    counts occurrences of each skill, and returns them sorted by
    frequency descending. This tells the user which skill to learn
    for the biggest market impact.
    """
    records = (
        db.query(JobScore.skill_gaps)
        .filter(JobScore.user_id == current_user_id, JobScore.skill_gaps.isnot(None))
        .all()
    )

    counter: Counter[str] = Counter()
    for (gaps,) in records:
        if gaps:
            counter.update(gaps)

    return [
        {"skill": skill, "count": count}
        for skill, count in counter.most_common()
    ]


@router.get("/pipeline-stats")
def get_pipeline_stats(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Application pipeline funnel statistics.

    Counts ApplicationTrack records per status and computes an overall
    conversion rate: (interviewing + offer) / total * 100.
    """
    rows = (
        db.query(
            ApplicationTrack.status,
            func.count(ApplicationTrack.id).label("count"),
        )
        .filter(ApplicationTrack.user_id == current_user_id)
        .group_by(ApplicationTrack.status)
        .all()
    )

    # Initialise every status to 0 so the response is always complete.
    counts = {status.value: 0 for status in ApplicationStatus}
    for row in rows:
        counts[row.status.value] = row.count

    total = sum(counts.values())
    advancing = counts["interviewing"] + counts["offer"]
    conversion_rate = round((advancing / total) * 100, 1) if total else 0.0

    return {
        **counts,
        "total": total,
        "conversionRate": conversion_rate,
    }


@router.get("/sources")
def get_sources(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Job-listing count per scraping source (e.g. linkedin, indeed).

    Groups the JobListing table by the `source` column and returns
    counts sorted descending.
    """
    rows = (
        db.query(
            JobListing.source,
            func.count(JobListing.id).label("count"),
        )
        .join(JobScore, JobScore.listing_id == JobListing.id)
        .filter(JobScore.user_id == current_user_id)
        .group_by(JobListing.source)
        .order_by(func.count(JobListing.id).desc())
        .all()
    )

    return [
        {"source": row.source, "count": row.count}
        for row in rows
    ]
