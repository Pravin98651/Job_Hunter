"""
Notification & scheduling service.

Provides:
- APScheduler-based cron for recurring scrapes
- Notification dispatch helpers (email placeholder, webhook)
- High-score match detection after each scrape
"""

import os
import json
import socket
from urllib.parse import urlparse
from datetime import datetime
from typing import Optional
from fastapi import HTTPException

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.job import JobScore

# Gemini client for generating digest summaries
try:
    from google import genai
    _api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    _client = genai.Client(api_key=_api_key) if _api_key else None
except ImportError:
    _client = None


def validate_webhook_url(url: str):
    """Validate webhook URL to prevent SSRF attacks."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid webhook URL scheme.")
        
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid webhook URL.")

    # Prevent loopback or local network addresses
    try:
        ip = socket.gethostbyname(hostname)
        if ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168.") or ip == "0.0.0.0":
            raise HTTPException(status_code=400, detail="Webhook URL resolves to a restricted internal IP.")
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook URL could not be resolved.")


def get_high_score_jobs(min_score: int = 80, limit: int = 10, user_id: str = None) -> list[dict]:
    """Fetch recent high-scoring jobs from the database."""
    db = SessionLocal()
    try:
        from app.models.job import JobListing
        query = (
            db.query(JobScore, JobListing)
            .join(JobListing, JobScore.listing_id == JobListing.id)
            .filter(JobScore.match_score >= min_score)
            .filter(JobScore.notified == False)
        )
        if user_id:
            query = query.filter(JobScore.user_id == user_id)
            
        records = query.order_by(JobScore.match_score.desc()).limit(limit).all()
        results = []
        for score, job in records:
            results.append({
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "matchScore": score.match_score,
                "matchReason": score.match_reason,
                "applyUrl": str(job.apply_url),
                "scoreId": str(score.id),
            })
        return results
    finally:
        db.close()


def mark_as_notified(score_ids: list[str]):
    """Mark job scores as notified so they aren't re-sent."""
    db = SessionLocal()
    try:
        for sid in score_ids:
            score = db.query(JobScore).filter(JobScore.id == sid).first()
            if score:
                score.notified = True
        db.commit()
    finally:
        db.close()


async def send_webhook_notification(
    webhook_url: str,
    jobs: list[dict],
    platform: str = "slack",
) -> bool:
    """Send a notification to a Slack or Telegram webhook."""
    import httpx

    if not webhook_url or not jobs:
        return False

    if platform == "slack":
        blocks = []
        for job in jobs[:5]:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*{job['title']}* at _{job['company']}_\n"
                        f"📍 {job['location']} | 🎯 Match: *{job['matchScore']}%*\n"
                        f"<{job['applyUrl']}|Apply Now>"
                    ),
                },
            })
        payload = {
            "text": f"🔥 {len(jobs)} new high-score job matches found!",
            "blocks": [
                {"type": "header", "text": {"type": "plain_text", "text": f"🔥 {len(jobs)} New High-Score Matches"}},
                *blocks,
            ],
        }
    elif platform == "telegram":
        lines = [f"🔥 *{len(jobs)} New High-Score Matches*\n"]
        for job in jobs[:5]:
            lines.append(
                f"• *{job['title']}* at _{job['company']}_\n"
                f"  📍 {job['location']} | 🎯 {job['matchScore']}%\n"
                f"  [Apply]({job['applyUrl']})"
            )
        payload = {
            "text": "\n".join(lines),
            "parse_mode": "Markdown",
        }
    else:
        return False

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code == 200
    except Exception as e:
        print(f"Webhook notification failed: {e}")
        return False


def generate_digest_summary(jobs: list[dict]) -> str:
    """Use Gemini to generate a natural language digest of new matches."""
    if not _client or not jobs:
        return f"Found {len(jobs)} new high-score job matches."

    job_list = "\n".join(
        f"- {j['title']} at {j['company']} ({j['matchScore']}% match)"
        for j in jobs[:10]
    )

    prompt = f"""Write a brief, energetic 2-3 sentence email digest summary for a job seeker.
These are their new high-scoring job matches:

{job_list}

Keep it motivating and concise. Don't include subject lines or greetings."""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"Digest generation failed: {e}")
        return f"Found {len(jobs)} new high-score job matches."
