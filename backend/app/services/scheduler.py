"""
Scheduler service using APScheduler for recurring scrapes and notifications.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.agents.orchestrator import orchestrator_app
from app.services.notifications import (
    get_high_score_jobs,
    mark_as_notified,
    send_webhook_notification,
    generate_digest_summary,
)

scheduler = AsyncIOScheduler()

# In-memory config for notification settings
_notification_config: dict = {
    "enabled": False,
    "scrape_interval_hours": 6,
    "min_score_threshold": 80,
    "slack_webhook": None,
    "telegram_webhook": None,
    "email": None,
    "scrape_query": "AI Engineer",
    "scrape_location": "Remote",
    "user_id": "00000000-0000-0000-0000-000000000000",
}


def get_config() -> dict:
    return _notification_config.copy()


def update_config(updates: dict) -> dict:
    _notification_config.update(updates)
    return _notification_config.copy()


async def scheduled_scrape_and_notify():
    """Run by the scheduler: scrape new jobs and send notifications."""
    config = get_config()
    print(f"[Scheduler] Running scheduled scrape: {config['scrape_query']} in {config['scrape_location']}")

    try:
        # Run the orchestrator pipeline
        await orchestrator_app.ainvoke({
            "user_id": config["user_id"],
            "query": config["scrape_query"],
            "location": config["scrape_location"],
            "user_profile": {},
            "raw_listings": [],
            "scored_listings": [],
        })
        print("[Scheduler] Scrape completed successfully.")
    except Exception as e:
        print(f"[Scheduler] Scrape failed: {e}")
        return

    # Check for high-score matches
    high_score_jobs = get_high_score_jobs(
        min_score=config["min_score_threshold"]
    )

    if not high_score_jobs:
        print("[Scheduler] No new high-score matches to notify about.")
        return

    print(f"[Scheduler] Found {len(high_score_jobs)} new high-score matches.")

    # Send Slack notification
    if config.get("slack_webhook"):
        success = await send_webhook_notification(
            config["slack_webhook"], high_score_jobs, "slack"
        )
        print(f"[Scheduler] Slack notification: {'sent' if success else 'failed'}")

    # Send Telegram notification
    if config.get("telegram_webhook"):
        success = await send_webhook_notification(
            config["telegram_webhook"], high_score_jobs, "telegram"
        )
        print(f"[Scheduler] Telegram notification: {'sent' if success else 'failed'}")

    # Mark as notified
    score_ids = [j["scoreId"] for j in high_score_jobs]
    mark_as_notified(score_ids)


def start_scheduler():
    """Start the APScheduler with the configured interval."""
    config = get_config()
    if not config["enabled"]:
        print("[Scheduler] Scheduling is disabled.")
        return

    hours = config.get("scrape_interval_hours", 6)

    # Remove existing job if any
    if scheduler.get_job("recurring_scrape"):
        scheduler.remove_job("recurring_scrape")

    scheduler.add_job(
        scheduled_scrape_and_notify,
        IntervalTrigger(hours=hours),
        id="recurring_scrape",
        name=f"Scrape every {hours}h",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()
    print(f"[Scheduler] Started. Scraping every {hours} hours.")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Stopped.")
