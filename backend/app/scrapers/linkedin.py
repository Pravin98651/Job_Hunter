import httpx
import urllib.parse
import asyncio
from bs4 import BeautifulSoup
from app.schemas.jobs import JobListingCreate

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}


async def _fetch_job_description(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch full job description from a LinkedIn job page."""
    for attempt in range(3):
        try:
            resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                desc_div = soup.find('div', class_='show-more-less-html__markup')
                if desc_div:
                    return desc_div.get_text(separator='\n').strip()
            elif resp.status_code == 429:
                await asyncio.sleep(2 ** attempt)
                continue
            break
        except (httpx.TimeoutException, httpx.ConnectError):
            await asyncio.sleep(1)
    return None


async def scrape_linkedin_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from LinkedIn using their unauthenticated jobs-guest API.
    Fetches listings in pages of 25, then fetches full descriptions concurrently.
    """
    jobs: list[JobListingCreate] = []
    encoded_query = urllib.parse.quote(query)
    encoded_location = urllib.parse.quote(location)

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            # Fetch listing cards (paginate if needed)
            raw_cards = []
            for start in range(0, max_results, 25):
                url = (
                    f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
                    f"?keywords={encoded_query}&location={encoded_location}&start={start}"
                )
                try:
                    response = await client.get(url, headers=HEADERS)
                    if response.status_code != 200:
                        print(f"LinkedIn search returned {response.status_code} at start={start}")
                        break
                    soup = BeautifulSoup(response.text, 'html.parser')
                    cards = soup.find_all('li')
                    if not cards:
                        break
                    raw_cards.extend(cards)
                except Exception as e:
                    print(f"Error fetching search page start={start}: {e}")
                    break

            # Parse card metadata
            parsed = []
            for idx, card in enumerate(raw_cards[:max_results]):
                title_el = card.find('h3', class_='base-search-card__title')
                company_el = card.find('h4', class_='base-search-card__subtitle')
                location_el = card.find('span', class_='job-search-card__location')
                link_el = card.find('a', class_='base-card__full-link')

                title = title_el.text.strip() if title_el else None
                company = company_el.text.strip() if company_el else None
                if not title or not company:
                    continue

                loc = location_el.text.strip() if location_el else "Not specified"
                apply_url = link_el['href'].split("?")[0] if link_el and 'href' in link_el.attrs else ""
                external_id = apply_url.split("-")[-1] if apply_url else f"li-{idx}"

                parsed.append({
                    "title": title,
                    "company": company,
                    "location": loc,
                    "apply_url": apply_url,
                    "external_id": external_id,
                })

            print(f"Parsed {len(parsed)} job cards from LinkedIn search results")

            # Fetch full descriptions concurrently (max 5 at a time)
            semaphore = asyncio.Semaphore(5)

            async def fetch_with_semaphore(card_data: dict) -> JobListingCreate:
                description = f"Job listing for {card_data['title']} at {card_data['company']}."
                if card_data['apply_url']:
                    async with semaphore:
                        full_desc = await _fetch_job_description(client, card_data['apply_url'])
                        if full_desc and len(full_desc) > 50:
                            description = full_desc
                        # small delay to avoid rate-limiting
                        await asyncio.sleep(0.5)

                return JobListingCreate(
                    title=card_data['title'],
                    company=card_data['company'],
                    location=card_data['location'],
                    description=description,
                    apply_url=card_data['apply_url'] or "https://www.linkedin.com/jobs",
                    source="linkedin",
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
                    print(f"Error fetching job detail: {r}")

    except Exception as e:
        print(f"Failed to scrape LinkedIn: {e}")

    print(f"Successfully scraped {len(jobs)} jobs from LinkedIn")
    return jobs
