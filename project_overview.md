# Job Hunt AI — Project Overview

Job Hunt AI is a comprehensive, end-to-end intelligent job search tracker and automation platform. It leverages Google's Gemini 2.0 Flash to match, score, and optimize your job applications, while giving you an elegant dashboard to manage the entire process.

## 🚀 Features Implemented So Far

### 1. Job Aggregation & Orchestration
- **Multi-Source Scraping**: Scrapes job listings from LinkedIn, Indeed, Glassdoor, Wellfound, and Remotive concurrently.
- **LangGraph Orchestrator**: Uses a `StateGraph` pipeline to Scrape → Deduplicate → Score → Persist jobs smoothly.
- **Cloudflare Resiliency**: Implemented mock fallbacks for Indeed and Glassdoor to prevent UI failures when scrapers hit anti-bot protections.

### 2. AI Resume Parsing & Scoring
- **PDF Resume Upload**: Extracts text using PyPDF2 and structures it via Gemini into a candidate profile.
- **Auto-fill Preferences**: Your target role, skills, and experience are auto-populated from the parsed resume.
- **Dynamic Match Scoring**: Each job is scored (0-100) against your specific resume by Gemini, taking into account Skills (40%), Title match (25%), Location (15%), Salary (10%), and Growth (10%).

### 3. Application Kanban Pipeline
- **Seamless Tracking**: Clicking "Apply" on a job automatically tracks it in the "Applied" state of your pipeline via background upsert.
- **Kanban Board**: Drag or drop (via dropdown status) jobs across `bookmarked`, `applied`, `interviewing`, `rejected`, and `offer` columns.
- **Cover Letter Generation**: One-click AI cover letter generation specifically tailored to both your resume and the specific job description.

### 4. Advanced Analytics & Market Insights
- **Score Trends**: Visualizes the average match score of found jobs over time using Chart.js.
- **Skill Gap Frequency**: Aggregates the most common skills missing from your resume across all scraped jobs, helping you know exactly what to learn next.
- **Pipeline Conversion Rate**: Visualizes your application-to-interview funnel.
- **Source Distribution**: Tracks which platforms are yielding the most listings.

### 5. Automated Scheduling & Notifications
- **APScheduler Integration**: Runs scrapes automatically in the background at configurable intervals (e.g., every 6 hours).
- **Webhooks**: Pushes notifications for new high-score matches (>85%) to Slack or Telegram.
- **AI Digest**: Gemini compiles a summary of the best jobs found in the most recent background scrape.

### 6. Interview Preparation
- **AI Mock Interviewer**: Generates 8-10 customized behavioral, technical, and situational interview questions with tips on how to answer them, tailored to the specific role and your resume.
- **Company Briefs**: Generates an overview of the hiring company including culture, recent news, and Glassdoor sentiment.

### 7. Hallucination Prevention & Accuracy
- **Temperature Control**: All generative features (scoring, cover letters, interview questions) operate at `temperature=0.0` for maximum factual adherence.
- **Strict Guardrails**: Prompts are constrained to prevent inventing candidate skills or making up unverified company news.

## 🛠 Tech Stack
- **Frontend**: Next.js 14 App Router, React, TailwindCSS, TypeScript, Chart.js.
- **Backend**: FastAPI, Python, SQLAlchemy, PostgreSQL.
- **AI Services**: `google-genai` (Gemini 2.0 Flash).
- **Automation**: `langgraph`, `APScheduler`, `httpx`, `BeautifulSoup4`.

---
*Created dynamically to track development progress.*
