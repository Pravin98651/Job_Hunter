# 🎯 Job Hunt AI Agent

Job Hunt AI is an autonomous, AI-powered job searching platform. Instead of manually scrolling through LinkedIn, this application deploys an intelligent agent to scrape job postings, semantically deduplicate them, and use Large Language Models (LLMs) to grade each job against your personal resume and career goals.

## ✨ Features

- **Automated Scraping**: Uses `Playwright` to autonomously navigate LinkedIn, bypass basic bot detection, and extract raw DOM job descriptions.
- **AI Scoring (Gemini 1.5 Pro)**: Integrates with a `LangGraph` orchestrator to pass raw job descriptions to Gemini. The AI acts as a recruiter, outputting a strict 0-100 `match_score`, identifying `skill_gaps`, and writing a human-readable `match_reason`.
- **Semantic Deduplication**: Uses `sentence-transformers` and Supabase `pgvector` to convert job descriptions into mathematical vectors. If a scraped job is semantically identical to one already in the database, it gets skipped automatically!
- **Modern Dashboard**: A beautiful, fully responsive `Next.js` and `shadcn/ui` frontend to visualize your top-matched jobs.

## 🛠️ Technology Stack

**Frontend:**
- Next.js (React)
- Tailwind CSS & shadcn/ui
- Lucide React Icons

**Backend:**
- FastAPI (Python)
- LangGraph (Agent Orchestration)
- Google GenAI (Gemini 1.5 Pro)
- Playwright (Headless Web Scraping)
- SQLAlchemy & Alembic

**Database:**
- Supabase (PostgreSQL)
- pgvector (Vector embeddings for deduplication)

## 🚀 Getting Started

### 1. Database Setup
This project requires a Supabase PostgreSQL database with the `pgvector` extension enabled. Update the connection string inside `backend/.env`:
```
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

### 2. Run the Backend (FastAPI)
```bash
cd backend
poetry install
poetry run playwright install chromium
poetry run uvicorn app.main:app --reload
```

### 3. Run the Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` and click **"Trigger Scrape"** to dispatch the LangGraph agent!
