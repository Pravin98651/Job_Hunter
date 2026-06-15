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

## 🔧 In Progress / Pending Features

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
- [ ] Match score trends over time (line chart)
- [ ] Skill-gap frequency analysis (bar chart — which skill to learn next)
- [ ] Application-to-interview conversion rates
- [ ] Analytics API endpoints
- [ ] Analytics tab with interactive charts

### Feature 5: Notifications & Scheduling
- [ ] Cron-based recurring scrapes (APScheduler or Celery Beat)
- [ ] Email alerts for new high-score matches
- [ ] Slack/Telegram webhook alerts
- [ ] Daily/weekly digest emails
- [ ] Notification preferences UI

### Feature 6: Interview Prep
- [ ] AI-generated interview questions from JD
- [ ] Mock interview chat mode
- [ ] Company research briefs (recent news, culture, Glassdoor sentiment)
- [ ] Interview prep tab/modal in frontend
