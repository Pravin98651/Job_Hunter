"""
Notification & scheduling service.

Provides:
- Notification dispatch helpers (email placeholder, webhook)
- High-score match detection after each scrape
- Digest summary generation via centralized LLM
"""

import ipaddress
import json
import logging
import socket
from urllib.parse import urlparse
from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from app.core.llm import client as _client
from app.db.session import SessionLocal
from app.models.job import JobScore

logger = logging.getLogger(__name__)


def validate_webhook_url(url: str):
    """Validate webhook URL to prevent SSRF attacks."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid webhook URL scheme.")
        
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid webhook URL.")

    # Resolve hostname and check against all private/reserved ranges
    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Webhook URL could not be resolved.")

    for family, _, _, _, sockaddr in resolved_ips:
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                raise HTTPException(
                    status_code=400,
                    detail="Webhook URL resolves to a restricted internal IP.",
                )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid IP address resolved.")


def get_high_score_jobs(min_score: int = 80, limit: int = 10, user_id: str = "") -> list[dict]:
    """Fetch recent high-scoring jobs from the database. user_id is required."""
    if not user_id:
        return []

    db = SessionLocal()
    try:
        from app.models.job import JobListing
        query = (
            db.query(JobScore, JobListing)
            .join(JobListing, JobScore.listing_id == JobListing.id)
            .filter(JobScore.match_score >= min_score)
            .filter(JobScore.notified.is_(False))
            .filter(JobScore.user_id == user_id)
        )
            
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
    """Mark job scores as notified so they aren't re-sent. Uses a single batch UPDATE."""
    if not score_ids:
        return
    db = SessionLocal()
    try:
        from sqlalchemy import update
        # Single batch UPDATE instead of N individual SELECT+UPDATE queries
        db.execute(
            update(JobScore)
            .where(JobScore.id.in_(score_ids))
            .values(notified=True)
        )
        db.commit()
        logger.info(f"Marked {len(score_ids)} scores as notified")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to mark scores as notified: {e}", exc_info=True)
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
        async with httpx.AsyncClient(timeout=10) as http_client:
            resp = await http_client.post(webhook_url, json=payload)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Webhook notification failed: {e}")
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
        logger.error(f"Digest generation failed: {e}")
        return f"Found {len(jobs)} new high-score job matches."
