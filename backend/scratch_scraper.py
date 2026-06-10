import asyncio
from app.scrapers.linkedin import scrape_linkedin_jobs

async def main():
    print("Testing LinkedIn scraper...")
    jobs = await scrape_linkedin_jobs("AI Engineer", "Remote", max_results=3)
    if not jobs:
        print("No jobs found!")
    else:
        for j in jobs:
            print(f"Title: {j.title}")
            print(f"Company: {j.company}")
            print(f"URL: {j.apply_url}")
            print(f"Description snippet: {j.description[:100]}...\n")

if __name__ == "__main__":
    asyncio.run(main())
