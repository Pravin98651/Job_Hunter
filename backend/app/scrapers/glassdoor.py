import httpx
import urllib.parse
import asyncio
from bs4 import BeautifulSoup
from app.schemas.jobs import JobListingCreate
import uuid
import json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
}

async def _fetch_glassdoor_job_description(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch full job description from a Glassdoor job page."""
    for attempt in range(2):
        try:
            resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                desc_div = soup.find('div', class_='JobDetails_jobDescription__uW_fK')
                if not desc_div:
                    # Alternative class name sometimes used by Glassdoor
                    desc_div = soup.find('div', id='JobDescriptionContainer')
                if desc_div:
                    return desc_div.get_text(separator='\n').strip()
            elif resp.status_code in [403, 429]:
                await asyncio.sleep(2)
                continue
            break
        except (httpx.TimeoutException, httpx.ConnectError):
            await asyncio.sleep(1)
    return None

async def scrape_glassdoor_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from Glassdoor using standard HTML requests.
    Note: Glassdoor has strict bot protection (Cloudflare). This is a best-effort scraper.
    """
    jobs: list[JobListingCreate] = []
    encoded_query = urllib.parse.quote(query.replace(' ', '-'))
    encoded_location = urllib.parse.quote(location)
    
    # Base URL for Glassdoor search (best effort URL structure)
    url = f"https://www.glassdoor.com/Job/jobs.htm?sc.keyword={encoded_query}&locT=&locId=&locKeyword={encoded_location}"

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=HEADERS)
                if response.status_code != 200:
                    print(f"Glassdoor search returned {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                cards = soup.find_all('li', class_='react-job-listing')
                
                parsed = []
                for idx, card in enumerate(cards[:max_results]):
                    # Glassdoor uses generic data-test attributes in newer layouts
                    title_el = card.find('a', attrs={'data-test': 'job-title'})
                    company_el = card.find('div', class_='job-search-8wag7x')
                    if not company_el:
                        company_el = card.find('span', class_='EmployerProfile_employerName__8w0tV')
                    location_el = card.find('div', attrs={'data-test': 'emp-location'})
                    
                    title = title_el.text.strip() if title_el else None
                    company = company_el.text.strip() if company_el else None
                    
                    if not title or not company:
                        continue
                        
                    loc = location_el.text.strip() if location_el else location
                    
                    # Try to extract salary
                    salary_min = None
                    salary_max = None
                    salary_el = card.find('div', attrs={'data-test': 'detailSalary'})
                    if salary_el:
                        salary_text = salary_el.text.strip().replace(',', '').replace('K', '000')
                        import re
                        numbers = [int(n) for n in re.findall(r'\d+', salary_text)]
                        if len(numbers) >= 2:
                            salary_min = min(numbers)
                            salary_max = max(numbers)
                        elif len(numbers) == 1:
                            salary_min = numbers[0]

                    apply_url = "https://www.glassdoor.com" + title_el['href'] if title_el and 'href' in title_el.attrs else ""
                    
                    # Extract external ID from job id attribute
                    external_id = card.get('data-id', str(uuid.uuid4()))

                    parsed.append({
                        "title": title,
                        "company": company,
                        "location": loc,
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "apply_url": apply_url,
                        "external_id": external_id,
                    })

                print(f"Parsed {len(parsed)} job cards from Glassdoor")

                # Fetch full descriptions concurrently
                semaphore = asyncio.Semaphore(3)

                async def fetch_with_semaphore(card_data: dict) -> JobListingCreate:
                    description = f"Job listing for {card_data['title']} at {card_data['company']}."
                    if card_data['apply_url']:
                        async with semaphore:
                            full_desc = await _fetch_glassdoor_job_description(client, card_data['apply_url'])
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
                        apply_url=card_data['apply_url'] or "https://www.glassdoor.com",
                        source="glassdoor",
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
                        print(f"Error fetching Glassdoor job detail: {r}")

            except Exception as e:
                print(f"Error executing Glassdoor search: {e}")

    except Exception as e:
        print(f"Failed to scrape Glassdoor: {e}")

    if len(jobs) == 0:
        print("Glassdoor scraper returned 0 jobs (likely blocked or no results).")

    print(f"Successfully scraped {len(jobs)} jobs from Glassdoor")
    return jobs
