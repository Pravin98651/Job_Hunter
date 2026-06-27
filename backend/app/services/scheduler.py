"""
Scheduler service using APScheduler for recurring scrapes and notifications.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone, timedelta

from app.agents.orchestrator import orchestrator_app
from app.services.notifications import (
    get_high_score_jobs,
    mark_as_notified,
    send_webhook_notification,
    generate_digest_summary,
)
from app.db.session import SessionLocal
from app.models.user import NotificationSettings, User, UserDocument
from app.models.application import ApplicationTrack, ApplicationStatus
from app.models.job import JobListing
from app.utils import s3_mock
from app.services.email_agent import send_email
from app.services.auto_apply import run_auto_fill
from app.core.llm import client as _client

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
            "auto_apply_enabled": getattr(config_obj, "auto_apply_enabled", False),
            "auto_apply_threshold": getattr(config_obj, "auto_apply_threshold", 90),
            "email": config_obj.email,
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

    applied_jobs = []
    
    # ── Autonomous Apply Block ──
    if config.get("auto_apply_enabled"):
        db = SessionLocal()
        try:
            for job in high_score_jobs:
                if job["matchScore"] >= config.get("auto_apply_threshold", 90):
                    logger.info(f"[Scheduler] Autonomously applying to {job['title']} at {job['company']}")
                    
                    # 1. Get Resume
                    doc = db.query(UserDocument).filter(UserDocument.user_id == user_id).first()
                    resume_bytes = s3_mock.download_file(doc.object_key) if doc else None
                    
                    # 2. Get Listing & Generate Cover Letter
                    listing = db.query(JobListing).filter(JobListing.id == job["scoreId"]).first()
                    # Wait, job["scoreId"] is the JobScore id. We need the listing_id. Let's just use the score object or job applyUrl
                    # We can use the job dict which has applyUrl
                    
                    cover_letter = None
                    if _client and listing:
                        prompt = f"Write a brief 3-paragraph cover letter for a {job['title']} position at {job['company']} based on these skills: {user_profile.get('skills', [])}"
                        try:
                            resp = _client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
                            cover_letter = resp.text.strip()
                        except Exception as e:
                            logger.error(f"[Scheduler] Auto-cover letter failed: {e}")

                    # 3. Apply via Playwright
                    success = await run_auto_fill(
                        apply_url=job["applyUrl"],
                        resume_profile=user_profile,
                        cover_letter_text=cover_letter,
                        resume_bytes=resume_bytes,
                        headless=True
                    )
                    
                    if success:
                        applied_jobs.append(job)
                        # Save tracking record
                        # We need the listing ID, let's fetch the score to get listing_id
                        from app.models.job import JobScore
                        score_record = db.query(JobScore).filter(JobScore.id == job["scoreId"]).first()
                        if score_record:
                            existing_app = db.query(ApplicationTrack).filter(
                                ApplicationTrack.listing_id == score_record.listing_id,
                                ApplicationTrack.user_id == user_id
                            ).first()
                            if not existing_app:
                                from datetime import datetime, timezone
                                app_track = ApplicationTrack(
                                    user_id=user_id,
                                    listing_id=score_record.listing_id,
                                    status=ApplicationStatus.applied,
                                    cover_letter=cover_letter,
                                    applied_at=datetime.now(timezone.utc)
                                )
                                db.add(app_track)
                                db.commit()
        finally:
            db.close()
    # ── End Autonomous Apply ──

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

    # Send Email Digest
    if config.get("email"):
        digest_summary = generate_digest_summary(high_score_jobs)
        email_body = f"Hello,\n\n{digest_summary}\n\n"
        if applied_jobs:
            email_body += f"\n🚀 I autonomously applied to {len(applied_jobs)} jobs for you!\n"
            for aj in applied_jobs:
                email_body += f"- {aj['title']} at {aj['company']}\n"
        email_body += "\n\nCheck your dashboard for more details."
        
        send_email(
            to_email=config["email"],
            subject=f"Job Hunt Agent: {len(high_score_jobs)} New Matches",
            body=email_body
        )

    # Mark as notified
    score_ids = [j["scoreId"] for j in high_score_jobs]
    mark_as_notified(score_ids)


async def scheduled_followup_for_user(user_id: str):
    """Run by the scheduler daily: draft follow-ups for stale applications."""
    db = SessionLocal()
    try:
        config_obj = db.query(NotificationSettings).filter(NotificationSettings.user_id == user_id).first()
        if not config_obj or not config_obj.enabled or not config_obj.email:
            return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
            
        stale_threshold = datetime.now(timezone.utc) - timedelta(days=7)
        
        stale_apps = db.query(ApplicationTrack).filter(
            ApplicationTrack.user_id == user_id,
            ApplicationTrack.status.in_([ApplicationStatus.applied, ApplicationStatus.interviewing])
        ).all()
        
        follow_ups_needed = []
        for app in stale_apps:
            if "Follow-up drafted" in (app.notes or ""):
                continue
                
            date_to_check = app.applied_at or app.created_at
            if getattr(date_to_check, "tzinfo", None) is None:
                date_to_check = date_to_check.replace(tzinfo=timezone.utc)
                
            if date_to_check < stale_threshold:
                follow_ups_needed.append(app)
                
        if not follow_ups_needed:
            logger.info(f"[Scheduler] No stale applications found for follow-up for user {user_id}.")
            return
            
        logger.info(f"[Scheduler] Found {len(follow_ups_needed)} stale applications for user {user_id}. Drafting follow-ups...")
        
        drafts = []
        for app in follow_ups_needed:
            listing = db.query(JobListing).filter(JobListing.id == app.listing_id).first()
            if not listing:
                continue
                
            draft = None
            if _client:
                prompt = f"""
Write a brief, polite follow-up email/LinkedIn message for a job application.
Job Title: {listing.title}
Company: {listing.company}
Status: {app.status.value} (applied over 7 days ago)
Candidate Name: {user.name or 'The Candidate'}

Keep it under 100 words, highly professional, expressing continued interest. Do not include placeholders if possible, or use the candidate name.
"""
                try:
                    resp = _client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
                    draft = resp.text.strip()
                except Exception as e:
                    logger.error(f"[Scheduler] Follow-up drafting failed: {e}")
                    
            if draft:
                drafts.append({
                    "title": listing.title,
                    "company": listing.company,
                    "draft": draft
                })
                # Mark as drafted
                today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                app.notes = (app.notes or "") + f"\n[Agent]: Follow-up drafted on {today_str}."
                
        if drafts:
            # Send the email digest
            email_body = f"Hello {user.name or ''},\n\nIt's been over a week since you applied to some jobs. To ensure you stay top-of-mind, I have proactively drafted follow-up messages for you to send to recruiters:\n\n"
            for d in drafts:
                email_body += f"--- {d['title']} at {d['company']} ---\n{d['draft']}\n\n"
            email_body += "You can copy and paste these into LinkedIn or an email. Good luck!\n\nBest,\nYour Job Hunt Agent"
            
            send_email(
                to_email=config_obj.email,
                subject=f"Action Required: {len(drafts)} Job Follow-Ups Drafted",
                body=email_body
            )
            logger.info(f"[Scheduler] Sent follow-up drafts email to {config_obj.email}.")
            
            db.commit()

    except Exception as e:
        logger.error(f"[Scheduler] Error in scheduled_followup_for_user for {user_id}: {e}", exc_info=True)
    finally:
        db.close()


def schedule_user(user_id: str, hours: int):
    """Start or update the APScheduler jobs for a user."""
    scrape_job_id = f"scrape_{user_id}"
    followup_job_id = f"followup_{user_id}"
    
    if scheduler.get_job(scrape_job_id):
        scheduler.remove_job(scrape_job_id)
    if scheduler.get_job(followup_job_id):
        scheduler.remove_job(followup_job_id)

    scheduler.add_job(
        scheduled_scrape_and_notify_for_user,
        IntervalTrigger(hours=hours),
        args=[user_id],
        id=scrape_job_id,
        name=f"Scrape every {hours}h for {user_id}",
        replace_existing=True,
    )
    
    scheduler.add_job(
        scheduled_followup_for_user,
        IntervalTrigger(days=1),
        args=[user_id],
        id=followup_job_id,
        name=f"Daily follow-up for {user_id}",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()
    logger.info(f"[Scheduler] Started jobs for {user_id}. Scraping every {hours}h, Follow-ups daily.")


def unschedule_user(user_id: str):
    """Stop the scheduler for a user."""
    scrape_job_id = f"scrape_{user_id}"
    followup_job_id = f"followup_{user_id}"
    if scheduler.get_job(scrape_job_id):
        scheduler.remove_job(scrape_job_id)
    if scheduler.get_job(followup_job_id):
        scheduler.remove_job(followup_job_id)
        logger.info(f"[Scheduler] Stopped jobs for {user_id}.")


def start_scheduler():
    """Start the APScheduler for all enabled users (called on startup)."""
    db = SessionLocal()
    scheduled_count = 0
    try:
        active_configs = db.query(NotificationSettings).filter(NotificationSettings.enabled.is_(True)).all()
        for c in active_configs:
            try:
                schedule_user(str(c.user_id), c.scrape_interval_hours)
                scheduled_count += 1
            except Exception as e:
                logger.error(f"[scheduler] Failed to schedule user {c.user_id}: {e}")
    finally:
        db.close()
    logger.info(f"[scheduler] Startup complete — {scheduled_count} user(s) scheduled")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
