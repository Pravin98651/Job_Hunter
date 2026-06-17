"""
Notification & scheduling endpoints.

Provides REST endpoints to configure and control the recurring scrape
scheduler, notification webhooks, and digest settings.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from uuid import UUID
from app.api.deps import get_current_user_id

from app.services.scheduler import (
    schedule_user,
    unschedule_user,
    scheduled_scrape_and_notify_for_user,
)
from app.services.notifications import get_high_score_jobs, generate_digest_summary, validate_webhook_url
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.models.user import NotificationSettings

router = APIRouter()


class NotificationConfigUpdate(BaseModel):
    enabled: bool | None = None
    scrape_interval_hours: int | None = None
    min_score_threshold: int | None = None
    slack_webhook: str | None = None
    telegram_webhook: str | None = None
    email: str | None = None
    scrape_query: str | None = None
    scrape_location: str | None = None


@router.get("/config")
def get_notification_config(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get current notification & scheduling configuration."""
    config = db.query(NotificationSettings).filter(NotificationSettings.user_id == current_user_id).first()
    if not config:
        config = NotificationSettings(user_id=current_user_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return {
        "enabled": config.enabled,
        "scrape_interval_hours": config.scrape_interval_hours,
        "min_score_threshold": config.min_score_threshold,
        "slack_webhook": config.slack_webhook,
        "telegram_webhook": config.telegram_webhook,
        "email": config.email,
        "scrape_query": config.scrape_query,
        "scrape_location": config.scrape_location,
        "user_id": str(config.user_id),
    }


@router.patch("/config")
def update_notification_config(
    updates: NotificationConfigUpdate, 
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update notification & scheduling configuration."""
    # Validate Webhooks for SSRF
    if updates.slack_webhook:
        validate_webhook_url(updates.slack_webhook)
    if updates.telegram_webhook:
        validate_webhook_url(updates.telegram_webhook)

    config = db.query(NotificationSettings).filter(NotificationSettings.user_id == current_user_id).first()
    if not config:
        config = NotificationSettings(user_id=current_user_id)
        db.add(config)

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    for key, value in update_data.items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)

    # Restart scheduler for this user if enabled
    if config.enabled:
        schedule_user(str(current_user_id), config.scrape_interval_hours)
    else:
        unschedule_user(str(current_user_id))

    return {
        "enabled": config.enabled,
        "scrape_interval_hours": config.scrape_interval_hours,
        "min_score_threshold": config.min_score_threshold,
        "slack_webhook": config.slack_webhook,
        "telegram_webhook": config.telegram_webhook,
        "email": config.email,
        "scrape_query": config.scrape_query,
        "scrape_location": config.scrape_location,
        "user_id": str(config.user_id),
    }


@router.post("/start")
def start_notifications(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Start the recurring scrape scheduler."""
    config = db.query(NotificationSettings).filter(NotificationSettings.user_id == current_user_id).first()
    if config:
        config.enabled = True
        db.commit()
        schedule_user(str(current_user_id), config.scrape_interval_hours)
    return {"status": "Scheduler started"}


@router.post("/stop")
def stop_notifications(current_user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Stop the recurring scrape scheduler."""
    config = db.query(NotificationSettings).filter(NotificationSettings.user_id == current_user_id).first()
    if config:
        config.enabled = False
        db.commit()
        unschedule_user(str(current_user_id))
    return {"status": "Scheduler stopped"}


@router.post("/trigger")
async def trigger_scrape_now(current_user_id: UUID = Depends(get_current_user_id)):
    """Manually trigger a scrape + notification cycle."""
    await scheduled_scrape_and_notify_for_user(str(current_user_id))
    return {"status": "Scrape and notification cycle completed"}


@router.get("/preview-digest")
def preview_digest(current_user_id: UUID = Depends(get_current_user_id)):
    """Preview what a notification digest would look like right now."""
    jobs = get_high_score_jobs(min_score=70, limit=10, user_id=str(current_user_id))
    summary = generate_digest_summary(jobs)
    return {
        "jobCount": len(jobs),
        "jobs": jobs,
        "digestSummary": summary,
    }
