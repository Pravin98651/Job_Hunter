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
- [x] Playwright-powered "⚡ Auto-Fill Application" heuristic form population using Resume profile.

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
- [x] Mock interview questions generator (Gemini AI + Job + Resume)
- [x] Company research brief generator (Culture, Recent News, Glassdoor Sentiment)
- [x] Interview API endpoints (`/interview/questions`, `/interview/company-brief`)
- [x] Full-screen Interactive Interview Prep Modal
- [x] Structured JSON parsing utility for LLM outputs

### Phase 4: Bug Fixes & Refinements
- [x] **Application Tracking Sync**: Applying externally automatically adds job to 'Applied' column in Pipeline
- [x] **Hallucination Prevention**: Enforced `temperature=0.0` and strict anti-hallucination prompts across all Gemini features (scoring, cover letter, interview prep)
- [x] **Job Source Diversification**: Added public API scraper `remotive.py` and fallback mocked responses for `indeed.py` and `glassdoor.py` to handle Cloudflare blocking
- [x] **Project Documentation**: Created `context.md` for architecture overview and `skills.md` for technical requirements
- [x] **UI/UX Modernization**: Overhauled typography (`Outfit` and `Inter`), implemented a premium Glassmorphic Indigo/Violet design system (`globals.css`), and completely refactored the layout with a sticky SaaS top navigation bar.
- [x] **Component System**: Replaced 30+ raw inline SVGs with standard `lucide-react` icons across `page.tsx` and `JobCard.tsx` for visual consistency and maintainability.

## 🚧 Upcoming / Pending
- [ ] Migrate to a managed database (e.g. Supabase, Vercel Postgres)
- [ ] Implement secure User Authentication (e.g. Clerk, NextAuth)
- [ ] Add advanced proxies or Playwright logic to fully bypass Cloudflare on Indeed/Glassdoor
