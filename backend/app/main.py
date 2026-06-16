from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import users, jobs, resume, applications, analytics, interview, notifications

app = FastAPI(title="Job Hunt AI API")

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
