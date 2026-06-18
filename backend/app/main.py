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

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler for startup/shutdown events."""
    # Startup
    logger.info("Starting scheduler for enabled users...")
    start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down scheduler...")
    stop_scheduler()


app = FastAPI(title="Job Hunt AI API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(resume.router, prefix="/resume", tags=["Resume"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Job Hunt AI API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
