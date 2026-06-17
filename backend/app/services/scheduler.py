"""
Scheduler service using APScheduler for recurring scrapes and notifications.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.agents.orchestrator import orchestrator_app
from app.services.notifications import (
    get_high_score_jobs,
    mark_as_notified,
    send_webhook_notification,
    generate_digest_summary,
)
from app.db.session import SessionLocal
from app.models.user import NotificationSettings, User

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def scheduled_scrape_and_notify_for_user(user_id: str):
    """Run by the scheduler: scrape new jobs and send notifications for a specific user."""
    db = SessionLocal()
    try:
        config_obj = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
        if not config_obj or not config_obj.enabled:
            return

        # Load the actual user profile for personalized scoring
        user = db.query(User).filter(User.id == user_id).first()
        user_profile = {}
        if user:
            # Build profile from resume_profile and preferences
            resume = user.resume_profile or {}
            prefs = user.preferences or {}
            user_profile = {
                "title": prefs.get("targetTitle", resume.get("targetTitle", "Software Engineer")),
                "skills": prefs.get("mustHaveSkills", resume.get("skills", [])),
                "experience_years": prefs.get("yearsExperience", resume.get("yearsExperience", 3)),
                "salary_expectation_min": prefs.get("minSalary", 0),
                "preferred_location": prefs.get("locations", ["Remote"])[0] if prefs.get("locations") else "Remote",
            }
            
        config = {
            "user_id": str(config_obj.user_id),
            "scrape_query": config_obj.scrape_query,
            "scrape_location": config_obj.scrape_location,
            "min_score_threshold": config_obj.min_score_threshold,
            "slack_webhook": config_obj.slack_webhook,
            "telegram_webhook": config_obj.telegram_webhook,
        }
    finally:
        db.close()

    logger.info(f"[Scheduler] Running scheduled scrape: {config['scrape_query']} in {config['scrape_location']} for user {user_id}")

    try:
        # Run the orchestrator pipeline with real user profile
        await orchestrator_app.ainvoke({
            "user_id": config["user_id"],
            "query": config["scrape_query"],
            "location": config["scrape_location"],
            "user_profile": user_profile,
            "raw_listings": [],
            "scored_listings": [],
        })
        logger.info(f"[Scheduler] Scrape completed successfully for user {user_id}.")
    except Exception as e:
        logger.error(f"[Scheduler] Scrape failed for user {user_id}: {e}")
        return

    # Check for high-score matches
    high_score_jobs = get_high_score_jobs(
        min_score=config["min_score_threshold"],
        user_id=config["user_id"],
    )

    if not high_score_jobs:
        logger.info(f"[Scheduler] No new high-score matches for user {user_id}.")
        return

    logger.info(f"[Scheduler] Found {len(high_score_jobs)} new high-score matches for user {user_id}.")

    # Send Slack notification
    if config.get("slack_webhook"):
        success = await send_webhook_notification(
            config["slack_webhook"], high_score_jobs, "slack"
        )
        logger.info(f"[Scheduler] Slack notification: {'sent' if success else 'failed'}")

    # Send Telegram notification
    if config.get("telegram_webhook"):
        success = await send_webhook_notification(
            config["telegram_webhook"], high_score_jobs, "telegram"
        )
        logger.info(f"[Scheduler] Telegram notification: {'sent' if success else 'failed'}")

    # Mark as notified
    score_ids = [j["scoreId"] for j in high_score_jobs]
    mark_as_notified(score_ids)


def schedule_user(user_id: str, hours: int):
    """Start or update the APScheduler job for a user."""
    job_id = f"scrape_{user_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    scheduler.add_job(
        scheduled_scrape_and_notify_for_user,
        IntervalTrigger(hours=hours),
        args=[user_id],
        id=job_id,
        name=f"Scrape every {hours}h for {user_id}",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()
    logger.info(f"[Scheduler] Started job for {user_id}. Scraping every {hours} hours.")


def unschedule_user(user_id: str):
    """Stop the scheduler for a user."""
    job_id = f"scrape_{user_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"[Scheduler] Stopped job for {user_id}.")


def start_scheduler():
    """Start the APScheduler for all enabled users (called on startup)."""
    db = SessionLocal()
    try:
        active_configs = db.query(NotificationSettings).filter(NotificationSettings.enabled == True).all()
        for c in active_configs:
            schedule_user(str(c.user_id), c.scrape_interval_hours)
    finally:
        db.close()

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
