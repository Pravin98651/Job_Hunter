from app.core.celery_app import celery_app
from app.scrapers.linkedin import scrape_linkedin_jobs
import asyncio

@celery_app.task
def scrape_linkedin_task(query: str, location: str):
    """
    Celery task to run the async Playwright scraper.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    results = loop.run_until_complete(scrape_linkedin_jobs(query, location))
    return f"Scraped {len(results)} jobs"
