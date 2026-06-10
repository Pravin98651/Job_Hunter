import urllib.request
import urllib.parse
from bs4 import BeautifulSoup

query = urllib.parse.quote("AI Engineer")
location = urllib.parse.quote("Remote")
url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={query}&location={location}&start=0"

req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        jobs = soup.find_all('li')
        print(f"Found {len(jobs)} jobs via API.")
        if jobs:
            title = jobs[0].find('h3', class_='base-search-card__title')
            company = jobs[0].find('h4', class_='base-search-card__subtitle')
            print(f"First Job: {title.text.strip() if title else 'N/A'} at {company.text.strip() if company else 'N/A'}")
except Exception as e:
    print(f"Error: {e}")
