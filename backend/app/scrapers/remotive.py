"""
Remotive scraper.

Uses Remotive's public JSON API — no authentication required.
All jobs returned are remote positions.
"""

import logging
import re
import urllib.parse
import uuid

import httpx

from app.schemas.jobs import JobListingCreate

logger = logging.getLogger(__name__)

# Pre-compiled HTML tag strip pattern
_HTML_TAG_RE = re.compile(r"<[^>]+>")


async def scrape_remotive_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from the Remotive public API.
    Remotive only serves remote jobs; the location parameter is informational only.
    """
    jobs: list[JobListingCreate] = []
    encoded_query = urllib.parse.quote(query)
    url = f"https://remotive.com/api/remote-jobs?search={encoded_query}&limit={max_results}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url)
            if response.status_code != 200:
                logger.warning(f"[remotive] API returned HTTP {response.status_code}")
                return []

            data = response.json()
            jobs_data = data.get("jobs", [])[:max_results]

            for job_data in jobs_data:
                raw_desc = job_data.get("description", "")
                # Strip HTML tags — pre-compiled regex for efficiency
                clean_desc = _HTML_TAG_RE.sub(" ", raw_desc).strip()

                jobs.append(
                    JobListingCreate(
                        title=job_data.get("title", "Remote Engineer"),
                        company=job_data.get("company_name", "Unknown Company"),
                        location=job_data.get("candidate_required_location", "Remote"),
                        salary_min=None,
                        salary_max=None,
                        description=clean_desc,
                        apply_url=job_data.get("url", "https://remotive.com/"),
                        source="remotive",
                        external_id=str(job_data.get("id", uuid.uuid4())),
                    )
                )

    except Exception as e:
        logger.error(f"[remotive] Scraper failed: {e}", exc_info=True)

    logger.info(f"[remotive] Scraped {len(jobs)} jobs")
    return jobs
