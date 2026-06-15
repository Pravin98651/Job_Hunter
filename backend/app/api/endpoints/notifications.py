"""
Notification & scheduling endpoints.

Provides REST endpoints to configure and control the recurring scrape
scheduler, notification webhooks, and digest settings.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.scheduler import (
    get_config,
    update_config,
    start_scheduler,
    stop_scheduler,
    scheduled_scrape_and_notify,
)
from app.services.notifications import get_high_score_jobs, generate_digest_summary

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
def get_notification_config():
    """Get current notification & scheduling configuration."""
    return get_config()


@router.patch("/config")
def update_notification_config(updates: NotificationConfigUpdate):
    """Update notification & scheduling configuration."""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    config = update_config(update_data)

    # Restart scheduler if enabled status changed
    if "enabled" in update_data:
        if config["enabled"]:
            start_scheduler()
        else:
            stop_scheduler()

    return config


@router.post("/start")
def start_notifications():
    """Start the recurring scrape scheduler."""
    config = update_config({"enabled": True})
    start_scheduler()
    return {"status": "Scheduler started", "config": config}


@router.post("/stop")
def stop_notifications():
    """Stop the recurring scrape scheduler."""
    update_config({"enabled": False})
    stop_scheduler()
    return {"status": "Scheduler stopped"}


@router.post("/trigger")
async def trigger_scrape_now():
    """Manually trigger a scrape + notification cycle."""
    await scheduled_scrape_and_notify()
    return {"status": "Scrape and notification cycle completed"}


@router.get("/preview-digest")
def preview_digest():
    """Preview what a notification digest would look like right now."""
    jobs = get_high_score_jobs(min_score=70, limit=10)
    summary = generate_digest_summary(jobs)
    return {
        "jobCount": len(jobs),
        "jobs": jobs,
        "digestSummary": summary,
    }
