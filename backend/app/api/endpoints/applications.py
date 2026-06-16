"""
Application tracking and cover letter generation endpoints.

Provides full CRUD for tracking job applications through a kanban-style
pipeline (bookmarked → applied → interviewing → rejected/offer) and
uses Gemini AI to generate tailored cover letters.
"""

import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import asyncio

from app.core.config import settings
from app.db.session import get_db
from app.models.application import ApplicationStatus, ApplicationTrack
from app.models.job import JobListing, JobScore
from app.models.user import UserDocument
from app.services.auto_apply import run_auto_fill
from app.api.deps import get_current_user_id

from app.core.llm import client as _client
import logging

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class TrackApplicationRequest(BaseModel):
    listing_id: str
    status: ApplicationStatus = ApplicationStatus.bookmarked


class UpdateStatusRequest(BaseModel):
    status: ApplicationStatus


class CoverLetterRequest(BaseModel):
    resume_profile: dict


# ---------------------------------------------------------------------------
# GET /applications/ — list all tracked applications with job + score data
# ---------------------------------------------------------------------------
@router.get("/")
def list_applications(
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Returns every tracked application joined with its JobListing and
    optional JobScore so the frontend has everything it needs in one call.
    """
    query = (
        db.query(ApplicationTrack, JobListing, JobScore)
        .join(JobListing, ApplicationTrack.listing_id == JobListing.id)
        .outerjoin(
            JobScore,
            (JobScore.listing_id == JobListing.id)
            & (JobScore.user_id == ApplicationTrack.user_id),
        )
    )

    query = query.filter(ApplicationTrack.user_id == current_user_id)
    query = query.order_by(ApplicationTrack.created_at.desc())

    results = []
    for app, job, score in query.all():
        results.append(
            {
                "applicationId": str(app.id),
                "listingId": str(app.listing_id),
                "userId": str(app.user_id),
                "status": app.status.value,
                "coverLetter": app.cover_letter,
                "notes": app.notes,
                "appliedAt": app.applied_at.isoformat() if app.applied_at else None,
                "createdAt": app.created_at.isoformat() if app.created_at else None,
                "updatedAt": app.updated_at.isoformat() if app.updated_at else None,
                # Job details
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "salaryMin": job.salary_min,
                "salaryMax": job.salary_max,
                "source": job.source,
                "description": job.description,
                "applyUrl": str(job.apply_url) if job.apply_url else None,
                # Score details (may be None if not yet scored)
                "matchScore": score.match_score if score else None,
                "matchReason": score.match_reason if score else None,
                "skillGaps": score.skill_gaps if score else None,
            }
        )
    return results


# ---------------------------------------------------------------------------
# POST /applications/ — start tracking a job
# ---------------------------------------------------------------------------
@router.post("/", status_code=201)
def track_application(
    request: TrackApplicationRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new application tracking entry for a job listing."""
    # Verify the listing exists
    listing = db.query(JobListing).filter(JobListing.id == request.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Job listing not found")

    # Prevent duplicate tracking or act as upsert
    existing = (
        db.query(ApplicationTrack)
        .filter(
            ApplicationTrack.listing_id == request.listing_id,
            ApplicationTrack.user_id == current_user_id
        )
        .first()
    )
    if existing:
        existing.status = request.status
        db.commit()
        db.refresh(existing)
        return {
            "id": str(existing.id),
            "status": existing.status,
            "message": "Updated existing application tracking"
        }

    # Create new tracking entry
    app_track = ApplicationTrack(
        user_id=current_user_id,
        listing_id=request.listing_id,
        status=request.status,
    )
    db.add(app_track)
    db.commit()
    db.refresh(app_track)

    return {
        "applicationId": str(app_track.id),
        "listingId": str(app_track.listing_id),
        "status": app_track.status.value,
        "createdAt": app_track.created_at.isoformat() if app_track.created_at else None,
    }


# ---------------------------------------------------------------------------
# PATCH /applications/{app_id}/status — move between kanban columns
# ---------------------------------------------------------------------------
@router.patch("/{app_id}/status")
def update_status(
    app_id: UUID,
    request: UpdateStatusRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update the status of a tracked application."""
    app_track = (
        db.query(ApplicationTrack).filter(ApplicationTrack.id == app_id, ApplicationTrack.user_id == current_user_id).first()
    )
    if not app_track:
        raise HTTPException(status_code=404, detail="Tracked application not found")

    app_track.status = request.status

    # Auto-set applied_at timestamp on first transition to "applied"
    if request.status == ApplicationStatus.applied and app_track.applied_at is None:
        from sqlalchemy.sql import func

        app_track.applied_at = func.now()

    db.commit()
    db.refresh(app_track)

    return {
        "applicationId": str(app_track.id),
        "status": app_track.status.value,
        "appliedAt": app_track.applied_at.isoformat() if app_track.applied_at else None,
        "updatedAt": app_track.updated_at.isoformat() if app_track.updated_at else None,
    }


# ---------------------------------------------------------------------------
# DELETE /applications/{app_id} — remove tracking
# ---------------------------------------------------------------------------
@router.delete("/{app_id}", status_code=204)
def delete_application(
    app_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Stop tracking a job application."""
    app_track = (
        db.query(ApplicationTrack).filter(ApplicationTrack.id == app_id, ApplicationTrack.user_id == current_user_id).first()
    )
    if not app_track:
        raise HTTPException(status_code=404, detail="Tracked application not found")

    db.delete(app_track)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# POST /applications/{app_id}/cover-letter — generate via Gemini
# ---------------------------------------------------------------------------
@router.post("/{app_id}/cover-letter")
def generate_cover_letter(
    app_id: UUID,
    request: CoverLetterRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Generate a tailored cover letter for a tracked application using
    Gemini 2.0 Flash. The letter is saved to the database and returned.
    """
    if not _client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API is not configured. Set GEMINI_API_KEY in .env.",
        )

    # Fetch the tracked application and its job listing
    app_track = (
        db.query(ApplicationTrack).filter(ApplicationTrack.id == app_id, ApplicationTrack.user_id == current_user_id).first()
    )
    if not app_track:
        raise HTTPException(status_code=404, detail="Tracked application not found")

    listing = (
        db.query(JobListing).filter(JobListing.id == app_track.listing_id).first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Associated job listing not found")

    # Build the prompt
    prompt = f"""You are an expert career coach and cover letter writer.

## Job Details
- Title: {listing.title}
- Company: {listing.company}
- Location: {listing.location}

## Job Description
{listing.description[:6000] if listing.description else "No description available."}

## Candidate Resume Profile
{_format_resume_profile(request.resume_profile)}

## Instructions
Write a professional, personalized cover letter for this candidate applying to the above job.

Guidelines:
1. Reference specific skills from the resume that directly match requirements in the job description.
2. Keep the letter concise — 3 to 4 paragraphs.
3. Highlight the unique value the candidate brings to this role.
4. Use a confident but not arrogant tone.
5. Do NOT include placeholder brackets like [Your Name] — use the candidate's actual name from the resume profile.
6. Return ONLY the cover letter text, no extra commentary.
7. CRITICAL: DO NOT hallucinate or invent skills. If the JD requires a skill the candidate lacks, do not say they have it. Focus entirely on the true skills from the resume.

"""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        cover_letter = response.text.strip()
    except Exception as e:
        logging.error(f"Gemini API call failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="An internal error occurred while generating the cover letter.",
        )

    # Persist to the database
    app_track.cover_letter = cover_letter
    db.commit()
    db.refresh(app_track)

    return {
        "applicationId": str(app_track.id),
        "coverLetter": cover_letter,
    }


# ---------------------------------------------------------------------------
# POST /applications/{app_id}/auto-fill — auto-fill using Playwright
# ---------------------------------------------------------------------------
class AutoFillRequest(BaseModel):
    resume_profile: dict


@router.post("/{app_id}/auto-fill")
def auto_fill_application(
    app_id: UUID,
    request: AutoFillRequest,
    background_tasks: BackgroundTasks,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Launches a non-headless Playwright browser in the background to automatically
    fill out an application form using heuristics from the user's resume profile.
    It stops before submission, allowing the user to review and submit manually.
    """
    app_track = db.query(ApplicationTrack).filter(ApplicationTrack.id == app_id, ApplicationTrack.user_id == current_user_id).first()
    if not app_track:
        raise HTTPException(status_code=404, detail="Tracked application not found")

    listing = db.query(JobListing).filter(JobListing.id == app_track.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Associated job listing not found")
        
    if not listing.apply_url:
        raise HTTPException(status_code=400, detail="Job listing has no apply URL")

    # Fetch the resume bytes if available
    doc = db.query(UserDocument).filter(UserDocument.user_id == app_track.user_id).first() if app_track.user_id else None
    resume_bytes = doc.file_data if doc else None

    # Add the playwright task to background tasks
    background_tasks.add_task(
        run_auto_fill_wrapper,
        apply_url=str(listing.apply_url),
        resume_profile=request.resume_profile,
        cover_letter_text=app_track.cover_letter,
        resume_bytes=resume_bytes
    )

    return {"message": "Auto-fill browser session launched."}

def run_auto_fill_wrapper(apply_url: str, resume_profile: dict, cover_letter_text: str | None, resume_bytes: bytes | None):
    # This runs the async playwright function in a new event loop since BackgroundTasks
    # runs sync functions in a separate thread, and calling async functions directly from it
    # without await can be tricky.
    import asyncio
    asyncio.run(run_auto_fill(apply_url, resume_profile, cover_letter_text, resume_bytes))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _format_resume_profile(profile: dict) -> str:
    """Format the resume profile dict into a readable string for the prompt."""
    lines = []
    for key, value in profile.items():
        if isinstance(value, list):
            lines.append(f"- {key}: {', '.join(str(v) for v in value)}")
        else:
            lines.append(f"- {key}: {value}")
    return "\n".join(lines) if lines else "No profile data provided."
