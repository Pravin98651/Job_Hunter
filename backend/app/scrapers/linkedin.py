import httpx
import urllib.parse
from bs4 import BeautifulSoup
from app.schemas.jobs import JobListingCreate

async def scrape_linkedin_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from LinkedIn using their unauthenticated jobs-guest API.
    This avoids Playwright and Datadome bot detection.
    """
    jobs = []
    encoded_query = urllib.parse.quote(query)
    encoded_location = urllib.parse.quote(location)
    url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={encoded_query}&location={encoded_location}&start=0"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            job_cards = soup.find_all('li')
            
            for idx, card in enumerate(job_cards):
                if len(jobs) >= max_results:
                    break
                    
                title_el = card.find('h3', class_='base-search-card__title')
                company_el = card.find('h4', class_='base-search-card__subtitle')
                location_el = card.find('span', class_='job-search-card__location')
                link_el = card.find('a', class_='base-card__full-link')
                
                title = title_el.text.strip() if title_el else "Unknown Title"
                company = company_el.text.strip() if company_el else "Unknown Company"
                loc = location_el.text.strip() if location_el else "Unknown Location"
                
                apply_url = link_el['href'] if link_el and 'href' in link_el.attrs else ""
                if apply_url and "?" in apply_url:
                    apply_url = apply_url.split("?")[0]
                    
                external_id = apply_url.split("-")[-1] if apply_url else f"linkedin-{idx}"
                
                description = f"Job listing for {title} at {company}. Please review the link for full details."
                # We could do a second request to get the full description, but for speed we rely on LLM to infer from title/company, or we fetch the JD URL.
                # Let's fetch the full description if possible by hitting the individual job URL.
                if apply_url:
                    try:
                        jd_response = await client.get(apply_url, headers=headers)
                        if jd_response.status_code == 200:
                            jd_soup = BeautifulSoup(jd_response.text, 'html.parser')
                            desc_div = jd_soup.find('div', class_='show-more-less-html__markup')
                            if desc_div:
                                description = desc_div.get_text(separator='\n').strip()
                    except Exception:
                        pass
                
                job = JobListingCreate(
                    title=title,
                    company=company,
                    location=loc,
                    description=description,
                    apply_url=apply_url or url,
                    source="linkedin",
                    external_id=external_id
                )
                jobs.append(job)
                
    except Exception as e:
        print(f"Failed to scrape LinkedIn via API: {e}")
        
    return jobs
