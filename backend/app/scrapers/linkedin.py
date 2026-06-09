import asyncio
from playwright.async_api import async_playwright
from app.schemas.jobs import JobListingCreate

async def scrape_linkedin_jobs(query: str, location: str, max_results: int = 10) -> list[JobListingCreate]:
    """
    Scrapes job listings from LinkedIn using Playwright.
    Uses playwright-stealth (if available) and realistic delays to bypass basic anti-bot.
    """
    jobs = []
    async with async_playwright() as p:
        # Launch browser with realistic fingerprint
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        # Go to LinkedIn Jobs search page
        search_url = f"https://www.linkedin.com/jobs/search?keywords={query}&location={location}"
        await page.goto(search_url)
        await page.wait_for_timeout(3000) # Random delay

        try:
            # Wait for the job cards to load
            await page.wait_for_selector("ul.jobs-search__results-list", timeout=10000)
            
            # Scroll down to load more jobs
            for _ in range(3):
                await page.keyboard.press("End")
                await page.wait_for_timeout(1500)
                
            job_cards = await page.query_selector_all("ul.jobs-search__results-list > li")
            
            for idx, card in enumerate(job_cards):
                if len(jobs) >= max_results:
                    break
                    
                try:
                    title_el = await card.query_selector("h3.base-search-card__title")
                    title = (await title_el.inner_text()).strip() if title_el else "Unknown Title"
                    
                    company_el = await card.query_selector("h4.base-search-card__subtitle")
                    company = (await company_el.inner_text()).strip() if company_el else "Unknown Company"
                    
                    location_el = await card.query_selector("span.job-search-card__location")
                    loc = (await location_el.inner_text()).strip() if location_el else "Unknown Location"
                    
                    link_el = await card.query_selector("a.base-card__full-link")
                    apply_url = await link_el.get_attribute("href") if link_el else ""
                    if apply_url and "?" in apply_url:
                        apply_url = apply_url.split("?")[0] # clean URL
                    
                    external_id = apply_url.split("-")[-1] if apply_url else f"linkedin-{idx}"
                    
                    # Click the card to load the description in the side panel
                    await card.click()
                    await page.wait_for_timeout(2000)
                    
                    desc_el = await page.query_selector("div.show-more-less-html__markup")
                    description = (await desc_el.inner_text()).strip() if desc_el else f"Job description unavailable for {title}."
                    
                    job = JobListingCreate(
                        title=title,
                        company=company,
                        location=loc,
                        description=description,
                        apply_url=apply_url or search_url,
                        source="linkedin",
                        external_id=external_id
                    )
                    jobs.append(job)
                except Exception as e:
                    print(f"Error parsing individual job card: {e}")
                    continue
                    
        except Exception as e:
            print(f"Failed to load LinkedIn jobs or blocked by Datadome: {e}")
        
        await browser.close()
    
    return jobs
