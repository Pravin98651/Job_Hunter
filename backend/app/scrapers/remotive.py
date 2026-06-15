import httpx
import urllib.parse
from app.schemas.jobs import JobListingCreate
import uuid

async def scrape_remotive_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from Remotive API (Public, No-Auth).
    Remotive only serves remote jobs, so the location parameter is mostly informational.
    """
    jobs: list[JobListingCreate] = []
    encoded_query = urllib.parse.quote(query)
    
    # Base URL for Remotive API
    url = f"https://remotive.com/api/remote-jobs?search={encoded_query}&limit={max_results}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url)
            if response.status_code != 200:
                print(f"Remotive API returned {response.status_code}")
                return []
            
            data = response.json()
            jobs_data = data.get("jobs", [])[:max_results]
            
            for job_data in jobs_data:
                # Need to strip HTML from description if it's too messy, or keep it.
                # Actually LLM handles HTML fine, but let's do a simple strip or just keep it.
                import re
                clean_desc = re.sub('<[^<]+>', ' ', job_data.get("description", ""))
                
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
        print(f"Failed to scrape Remotive: {e}")

    print(f"Successfully scraped {len(jobs)} jobs from Remotive")
    return jobs
