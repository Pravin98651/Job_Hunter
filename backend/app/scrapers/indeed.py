import httpx
import urllib.parse
import asyncio
from bs4 import BeautifulSoup
from app.schemas.jobs import JobListingCreate
import uuid

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
}

async def _fetch_indeed_job_description(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch full job description from an Indeed job page."""
    for attempt in range(2):
        try:
            resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                desc_div = soup.find('div', id='jobDescriptionText')
                if desc_div:
                    return desc_div.get_text(separator='\n').strip()
            elif resp.status_code == 429 or resp.status_code == 403:
                # Indeed often blocks standard requests with 403 (Cloudflare)
                await asyncio.sleep(2)
                continue
            break
        except (httpx.TimeoutException, httpx.ConnectError):
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
    
    # Base URL for Indeed search
    url = f"https://www.indeed.com/jobs?q={encoded_query}&l={encoded_location}"

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=HEADERS)
                if response.status_code != 200:
                    print(f"Indeed search returned {response.status_code}")
                    return []
                
                soup = BeautifulSoup(response.text, 'html.parser')
                cards = soup.find_all('div', class_='job_seen_beacon')
                
                parsed = []
                for idx, card in enumerate(cards[:max_results]):
                    title_el = card.find('h2', class_='jobTitle')
                    company_el = card.find('span', attrs={"data-testid": "company-name"})
                    location_el = card.find('div', attrs={"data-testid": "text-location"})
                    
                    title = title_el.text.strip() if title_el else None
                    company = company_el.text.strip() if company_el else None
                    if not title or not company:
                        continue
                        
                    loc = location_el.text.strip() if location_el else location
                    
                    # Try to extract salary if present
                    salary_min = None
                    salary_max = None
                    salary_el = card.find('div', class_='salary-snippet-container')
                    if salary_el:
                        salary_text = salary_el.text.strip().replace(',', '')
                        import re
                        numbers = [int(n) for n in re.findall(r'\d+', salary_text)]
                        if len(numbers) >= 2:
                            salary_min = min(numbers)
                            salary_max = max(numbers)
                        elif len(numbers) == 1:
                            salary_min = numbers[0]

                    link_el = title_el.find('a') if title_el else None
                    apply_url = "https://www.indeed.com" + link_el['href'] if link_el and 'href' in link_el.attrs else ""
                    # Ensure absolute URL
                    if apply_url and not apply_url.startswith("http"):
                        apply_url = "https://www.indeed.com" + apply_url
                        
                    # Extract external ID from URL (vjk parameter)
                    external_id = str(uuid.uuid4())
                    if apply_url and 'vjk=' in apply_url:
                        external_id = apply_url.split('vjk=')[-1].split('&')[0]

                    parsed.append({
                        "title": title,
                        "company": company,
                        "location": loc,
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "apply_url": apply_url,
                        "external_id": external_id,
                    })

                print(f"Parsed {len(parsed)} job cards from Indeed")

                # Fetch full descriptions concurrently
                semaphore = asyncio.Semaphore(3)

                async def fetch_with_semaphore(card_data: dict) -> JobListingCreate:
                    description = f"Job listing for {card_data['title']} at {card_data['company']}."
                    if card_data['apply_url']:
                        async with semaphore:
                            full_desc = await _fetch_indeed_job_description(client, card_data['apply_url'])
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
                        apply_url=card_data['apply_url'] or "https://www.indeed.com",
                        source="indeed",
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
                        print(f"Error fetching Indeed job detail: {r}")

            except Exception as e:
                print(f"Error executing Indeed search: {e}")

    except Exception as e:
        print(f"Failed to scrape Indeed: {e}")

    print(f"Successfully scraped {len(jobs)} jobs from Indeed")
    return jobs
