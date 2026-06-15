# Job Hunt AI — Project Status

## ✅ Completed Features

### Phase 1: Core Engine
- [x] **FastAPI Backend** with PostgreSQL + pgvector database
- [x] **LinkedIn Scraper** — scrapes job cards + full descriptions via guest API
- [x] **LLM Job Scorer** — Gemini 2.0 Flash scores jobs 0-100 on skills/title/salary/location/growth
- [x] **LangGraph Orchestrator** — pipeline: Scrape → Deduplicate → Score → Persist
- [x] **Deduplication Service** — hash-based duplicate detection across scrapes
- [x] **Next.js Frontend Dashboard** — premium Apple-inspired UI with Matches + Preferences tabs
- [x] **Preference Persistence** — localStorage-backed user preferences (title, skills, salary, location)
- [x] **Filter Chips** — instant filtering by score thresholds (All, 90%+, 75%+, 50%+)

### Phase 2: Resume & Multi-Source
- [x] **Resume Upload & AI Parsing** — PDF upload → PyPDF2 → Gemini AI extraction of structured profile
- [x] **Resume Auto-Fill** — parsed resume auto-populates preferences (skills, role, experience)
- [x] **Indeed Scraper** — best-effort HTML scraping with salary extraction
- [x] **Glassdoor Scraper** — best-effort HTML scraping with salary extraction
- [x] **Wellfound Scraper** — startup-focused scraper for AngelList/Wellfound
- [x] **Concurrent Multi-Source Orchestrator** — `asyncio.gather` across all 4 scrapers
- [x] **Dynamic User Profile Scoring** — orchestrator uses resume data instead of hardcoded profile
- [x] **ATS Resume Optimizer** — Gemini AI compares resume vs JD, suggests missing keywords + bullet rewrites
- [x] **Optimization Modal** — full-screen modal showing missing/matched keywords, tailored summary, bullet rewrites
- [x] **Softer Background** — warm off-white `#f5f5f0` for better readability

---

### Phase 3: Application & Advanced Features

### Feature 3: Application Automation
- [x] `ApplicationTrack` database model (status: bookmarked/applied/interviewing/rejected/offer)
- [x] CRUD API endpoints for application tracking
- [x] Cover letter generation endpoint (Gemini AI + resume + JD)
- [x] Kanban-style pipeline UI tab in frontend
- [x] Status transitions via dropdown selector
- [x] "Track" bookmark button on Job Cards
- [x] "Generate Cover Letter" button on pipeline cards
- [x] Cover letter modal with copy-to-clipboard

### Feature 4: Analytics Dashboard
- [x] Match score trends over time (bar chart)
- [x] Skill-gap frequency analysis (color-coded tags — which skill to learn next)
- [x] Application-to-interview conversion rates (pipeline funnel)
- [x] Job source distribution breakdown
- [x] Analytics API endpoints (`/analytics/score-trends`, `/analytics/skill-gaps`, `/analytics/pipeline-stats`, `/analytics/sources`)
- [x] Analytics tab with interactive CSS-based charts

### Feature 5: Notifications & Scheduling
- [x] APScheduler-based recurring scrapes with configurable interval
- [x] Slack webhook notifications for high-score matches
- [x] Telegram webhook notifications for high-score matches
- [x] AI-generated digest summaries via Gemini
- [x] Notification config API (`/notifications/config`, `/notifications/start`, `/notifications/stop`, `/notifications/trigger`)
- [x] High-score detection service with `notified` flag to prevent duplicates

### Feature 6: Interview Prep
- [x] AI-generated interview questions based on JD (8-10 behavioral/technical/situational)
- [x] Company research briefs (overview, culture, recent news, interview tips, Glassdoor sentiment)
- [x] Interview Prep tab with input form and dual-panel results
- [x] Interview API endpoints (`/interview/questions`, `/interview/company-brief`)

