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

async def _fetch_wellfound_job_description(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch full job description from a Wellfound job page."""
    for attempt in range(2):
        try:
            resp = await client.get(url, headers=get_random_headers(), follow_redirects=True, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                desc_div = soup.find('div', class_='styles_description__2x8P8')
                if not desc_div:
                    # Alternative class name sometimes used by Wellfound
                    desc_div = soup.find('div', class_='job-description')
                if desc_div:
                    return desc_div.get_text(separator='\n').strip()
            elif resp.status_code in [403, 429]:
                await asyncio.sleep(2)
                continue
            break
        except (httpx.TimeoutException, httpx.ConnectError):
            await asyncio.sleep(1)
    return None

async def scrape_wellfound_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from Wellfound (AngelList) using standard HTML requests.
    Note: Wellfound relies heavily on React and GraphQL. This is a best-effort scraper 
    targeting their SSR pages.
    """
    jobs: list[JobListingCreate] = []
    encoded_query = urllib.parse.quote(query.replace(' ', '-').lower())
    
    # Base URL for Wellfound role search
    url = f"https://wellfound.com/role/{encoded_query}"

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=get_random_headers())
                if response.status_code != 200:
                    logger.warning(f"[wellfound] Search page returned HTTP {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                # Finding job listings by their typical class structures
                cards = soup.find_all('div', class_='styles_jobListing__2T83K')
                if not cards:
                    cards = soup.find_all('div', class_='styles_component__1QGg8')
                
                parsed = []
                for idx, card in enumerate(cards[:max_results]):
                    title_el = card.find('a', class_='styles_jobTitle__3lP2J')
                    if not title_el:
                        title_el = card.find('a', attrs={'data-test': 'JobTitle'})
                        
                    company_el = card.find('h2', class_='styles_name__2b_2V')
                    if not company_el:
                        # Sometimes company name is inside a link
                        company_link = card.find('a', class_='styles_startupLink__19VfH')
                        if company_link:
                            company_el = company_link
                            
                    location_el = card.find('span', class_='styles_location__3BXZj')
                    
                    title = title_el.text.strip() if title_el else None
                    company = company_el.text.strip() if company_el else None
                    
                    if not title or not company:
                        continue
                        
                    loc = location_el.text.strip() if location_el else location
                    
                    # Try to extract salary
                    salary_min = None
                    salary_max = None
                    salary_el = card.find('span', class_='styles_compensation__3ZqH-')
                    if salary_el:
                        salary_text = salary_el.text.strip().replace(',', '').replace('k', '000').replace('K', '000')
                        numbers = [int(n) for n in re.findall(r'\d+', salary_text)]
                        if len(numbers) >= 2:
                            salary_min = min(numbers)
                            salary_max = max(numbers)
                        elif len(numbers) == 1:
                            salary_min = numbers[0]

                    apply_url = "https://wellfound.com" + title_el['href'] if title_el and 'href' in title_el.attrs else ""
                    
                    external_id = str(uuid.uuid4())
                    if apply_url and '/jobs/' in apply_url:
                        external_id = apply_url.split('/jobs/')[-1].split('-')[0]

                    parsed.append({
                        "title": title,
                        "company": company,
                        "location": loc,
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "apply_url": apply_url,
                        "external_id": external_id,
                    })

                logger.info(f"[wellfound] Parsed {len(parsed)} job cards")

                # Fetch full descriptions concurrently
                semaphore = asyncio.Semaphore(3)

                async def fetch_with_semaphore(card_data: dict) -> JobListingCreate:
                    description = f"Job listing for {card_data['title']} at {card_data['company']}."
                    if card_data['apply_url']:
                        async with semaphore:
                            full_desc = await _fetch_wellfound_job_description(client, card_data['apply_url'])
                            if full_desc and len(full_desc) > 50:
                                description = full_desc
                            await asyncio.sleep(1)

                    return JobListingCreate(
                        title=card_data['title'],
                        company=card_data['company'],
                        location=card_data['location'],
                        salary_min=card_data.get('salary_min'),
                        salary_max=card_data.get('salary_max'),
                        description=description,
                        apply_url=card_data['apply_url'] or "https://wellfound.com",
                        source="wellfound",
                        external_id=card_data['external_id'],
                    )

                results = await asyncio.gather(
                    *[fetch_with_semaphore(p) for p in parsed],
                    return_exceptions=True
                )

                for r in results:
                    if isinstance(r, JobListingCreate):
                        jobs.append(r)
                    elif isinstance(r, Exception):
                        logger.warning(f"[wellfound] Error fetching job detail: {r}")

            except Exception as e:
                logger.error(f"[wellfound] Search execution failed: {e}", exc_info=True)

    except Exception as e:
        logger.error(f"[wellfound] Scraper failed: {e}", exc_info=True)

    logger.info(f"[wellfound] Scraped {len(jobs)} jobs")
    return jobs
