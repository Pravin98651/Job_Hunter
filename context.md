# Job Hunt - Project Context

## Project Overview
Job Hunt is an AI-powered job search tracking and automation platform. It aggregates job listings from multiple sources (LinkedIn, Remotive, Indeed, Glassdoor, Wellfound), scores them against the user's resume using Gemini 2.0 Flash, and provides a centralized dashboard to track applications.

## Core Features
1. **Job Scraping & Aggregation**: Scrapes multiple platforms concurrently to find job listings matching user criteria.
2. **AI-Powered Matching**: Uses Google's Gemini LLM to evaluate the candidate's resume against the Job Description, returning a match score (0-100), detailed fit reasoning, and identified skill gaps.
3. **Application Pipeline**: A Kanban-style board to track the status of applications (`bookmarked`, `applied`, `interviewing`, `rejected`, `offer`).
4. **Cover Letter Generation**: Uses Gemini to instantly generate tailored, concise cover letters using the job description and the candidate's resume.
5. **Interview Prep**: Generates mock interview questions and company research briefs tailored to the specific role.
6. **Analytics Dashboard**: Tracks match score trends, application conversion rates, top skill gaps in the market, and source distributions.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, TypeScript, Chart.js/react-chartjs-2 for analytics.
- **Backend**: FastAPI, Python 3, SQLAlchemy, PostgreSQL (Supabase/local).
- **AI Integration**: `google-genai` SDK using `gemini-2.0-flash`.
- **Scraping**: `httpx` and `BeautifulSoup4` for lightweight scraping.
- **Workflow / Agent Orchestration**: `langgraph` (StateGraph) for managing the scraping and scoring pipeline.
- **Task Scheduling**: `APScheduler` for background/cron jobs (e.g., automated scraping and notifications).

## Key Files & Architecture
- **`backend/app/main.py`**: The FastAPI entry point.
- **`backend/app/api/endpoints/`**: Contains REST routers for jobs, applications, analytics, and interview endpoints.
- **`backend/app/agents/orchestrator.py`**: Runs the concurrent `scrape_jobs` and `score_jobs` flow using LangGraph.
- **`frontend/src/app/page.tsx`**: The primary monolithic UI that handles state for Tabs (Matches, Pipeline, Resumes, Analytics, Settings).
- **`frontend/src/components/`**: Reusable UI components like `JobCard`, `ScoreBar`, and `AnalyticsChart`.

## Current State
The core functionality is complete and functional. Next steps could involve adding full user authentication (e.g., Clerk), setting up a managed PostgreSQL database, and refining scraper robustness to handle Cloudflare blocking entirely.
