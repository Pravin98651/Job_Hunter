import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.endpoints import users, jobs, resume, applications, analytics, interview, notifications
from app.services.scheduler import start_scheduler, stop_scheduler
from app.core.config import settings

logger = logging.getLogger(__name__)

# Rate limiter — shared state via app.state
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler for startup/shutdown events."""
    logger.info("Starting Job Hunt AI API...")
    start_scheduler()
    yield
    logger.info("Shutting down Job Hunt AI API...")
    stop_scheduler()


app = FastAPI(
    title="Job Hunt AI API",
    version="1.0.0",
    description=(
        "AI-powered job search aggregation, scoring, and application tracking. "
        "Uses Gemini 2.0 Flash for resume matching, cover letter generation, and interview prep."
    ),
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — origins are configured via CORS_ORIGINS in settings / .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(users.router,         prefix="/users",         tags=["Users"])
app.include_router(jobs.router,          prefix="/jobs",          tags=["Jobs"])
app.include_router(resume.router,        prefix="/resume",        tags=["Resume"])
app.include_router(applications.router,  prefix="/applications",  tags=["Applications"])
app.include_router(analytics.router,     prefix="/analytics",     tags=["Analytics"])
app.include_router(interview.router,     prefix="/interview",     tags=["Interview"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])


@app.get("/", tags=["Meta"])
def read_root():
    return {"message": "Welcome to Job Hunt AI API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health", tags=["Meta"])
def health_check():
    """
    Liveness probe. Verifies the API is running AND the database is reachable.
    Returns 200 if healthy, 503 if the database is unreachable.
    """
    from app.db.session import engine
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check DB failure: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unreachable", "detail": str(e)},
        )
