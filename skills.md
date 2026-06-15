# Job Hunt - Required Technical Skills

To maintain and extend the Job Hunt project, the following technical skills are required:

## Frontend
- **React & Next.js (App Router)**: Deep understanding of React hooks (`useState`, `useEffect`, `useCallback`), server vs client components, and Next.js routing.
- **TypeScript**: Ability to define and use interfaces for API responses and component props.
- **TailwindCSS**: Proficiency in utility-first CSS, responsive design, and custom animations (`animate-`).
- **Data Visualization**: Familiarity with `Chart.js` and `react-chartjs-2` for rendering line, bar, and doughnut charts.

## Backend
- **FastAPI (Python)**: Building async REST APIs, dependency injection (e.g., `Depends(get_db)`), and OpenAPI documentation.
- **SQLAlchemy & PostgreSQL**: ORM modeling, queries, migrations, and handling UUIDs.
- **Async Python**: Using `asyncio.gather` for concurrent execution of scrapers and I/O tasks.
- **Background Tasks**: Configuring and managing `APScheduler` for cron jobs.

## AI & Data Processing
- **Google Gemini API**: Using the `google-genai` SDK for structured JSON generation, enforcing `temperature=0.0` for deterministic outputs, and prompt engineering for extraction and summarization.
- **LangGraph**: Creating stateful workflows (`StateGraph`) to orchestrate complex multi-step pipelines (scrape -> deduplicate -> score).
- **Web Scraping**: Utilizing `httpx` and `BeautifulSoup` to parse HTML, alongside strategies to bypass anti-bot protections (like Cloudflare) or utilize public APIs.

## DevOps & Tools
- **Node.js / npm**: Managing frontend dependencies and scripts.
- **Poetry**: Managing Python virtual environments and dependencies.
- **Git**: Version control for tracking features and bug fixes.
