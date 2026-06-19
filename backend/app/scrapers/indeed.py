"""
Indeed scraper.

Scrapes https://www.indeed.com/jobs for job listings.
Note: Indeed has aggressive Cloudflare bot protection — this scraper may
frequently return 0 results. It is a best-effort implementation.
"""

import asyncio
import logging
import re
import urllib.parse
import uuid

import httpx
from bs4 import BeautifulSoup

from app.schemas.jobs import JobListingCreate
from app.utils.http import get_random_headers

logger = logging.getLogger(__name__)


async def _fetch_indeed_job_description(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch full job description from an Indeed job page."""
    for attempt in range(2):
        try:
            resp = await client.get(url, headers=get_random_headers(), follow_redirects=True, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                desc_div = soup.find("div", id="jobDescriptionText")
                if desc_div:
                    return desc_div.get_text(separator="\n").strip()
            elif resp.status_code in (403, 429):
                logger.warning(f"[indeed] HTTP {resp.status_code} on description fetch (likely Cloudflare) — attempt {attempt + 1}")
                await asyncio.sleep(2)
                continue
            break
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            logger.debug(f"[indeed] Description fetch network error (attempt {attempt + 1}): {e}")
            await asyncio.sleep(1)
    return None


async def scrape_indeed_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from Indeed using standard HTML requests.
    Note: Indeed has aggressive bot protection. This is a best-effort scraper.
    """
    jobs: list[JobListingCreate] = []
    encoded_query = urllib.parse.quote(query)
    encoded_location = urllib.parse.quote(location)
    url = f"https://www.indeed.com/jobs?q={encoded_query}&l={encoded_location}"

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=get_random_headers())
                if response.status_code != 200:
                    logger.warning(f"[indeed] Search page returned HTTP {response.status_code}")
                    return []

                soup = BeautifulSoup(response.text, "html.parser")
                cards = soup.find_all("div", class_="job_seen_beacon")

                parsed = []
                for idx, card in enumerate(cards[:max_results]):
                    title_el = card.find("h2", class_="jobTitle")
                    company_el = card.find("span", attrs={"data-testid": "company-name"})
                    location_el = card.find("div", attrs={"data-testid": "text-location"})

                    title = title_el.text.strip() if title_el else None
                    company = company_el.text.strip() if company_el else None
                    if not title or not company:
                        continue

                    loc = location_el.text.strip() if location_el else location

                    # Extract salary if present
                    salary_min = None
                    salary_max = None
                    salary_el = card.find("div", class_="salary-snippet-container")
                    if salary_el:
                        salary_text = salary_el.text.strip().replace(",", "")
                        numbers = [int(n) for n in re.findall(r"\d+", salary_text)]
                        if len(numbers) >= 2:
                            salary_min = min(numbers)
                            salary_max = max(numbers)
                        elif len(numbers) == 1:
                            salary_min = numbers[0]

                    link_el = title_el.find("a") if title_el else None
                    apply_url = "https://www.indeed.com" + link_el["href"] if link_el and "href" in link_el.attrs else ""
                    if apply_url and not apply_url.startswith("http"):
                        apply_url = "https://www.indeed.com" + apply_url

                    # Extract external ID from URL (vjk parameter)
                    external_id = str(uuid.uuid4())
                    if apply_url and "vjk=" in apply_url:
                        external_id = apply_url.split("vjk=")[-1].split("&")[0]

                    parsed.append({
                        "title": title,
                        "company": company,
                        "location": loc,
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "apply_url": apply_url,
                        "external_id": external_id,
                    })

                logger.info(f"[indeed] Parsed {len(parsed)} job cards")

                # Fetch full descriptions concurrently
                semaphore = asyncio.Semaphore(3)

                async def fetch_with_semaphore(card_data: dict) -> JobListingCreate:
                    description = f"Job listing for {card_data['title']} at {card_data['company']}."
                    if card_data["apply_url"]:
                        async with semaphore:
                            full_desc = await _fetch_indeed_job_description(client, card_data["apply_url"])
                            if full_desc and len(full_desc) > 50:
                                description = full_desc
                            await asyncio.sleep(1)

                    return JobListingCreate(
                        title=card_data["title"],
                        company=card_data["company"],
                        location=card_data["location"],
                        salary_min=card_data.get("salary_min"),
                        salary_max=card_data.get("salary_max"),
                        description=description,
                        apply_url=card_data["apply_url"] or "https://www.indeed.com",
                        source="indeed",
                        external_id=card_data["external_id"],
                    )

                results = await asyncio.gather(
                    *[fetch_with_semaphore(p) for p in parsed],
                    return_exceptions=True,
                )

                for r in results:
                    if isinstance(r, JobListingCreate):
                        jobs.append(r)
                    elif isinstance(r, Exception):
                        logger.warning(f"[indeed] Error fetching job detail: {r}")

            except Exception as e:
                logger.error(f"[indeed] Search execution failed: {e}", exc_info=True)

    except Exception as e:
        logger.error(f"[indeed] Scraper failed: {e}", exc_info=True)

    if len(jobs) == 0:
        logger.info("[indeed] Returned 0 jobs (likely blocked by bot protection or no results)")

    logger.info(f"[indeed] Scraped {len(jobs)} jobs")
    return jobs
