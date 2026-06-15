"""
Interview Prep endpoints.

Provides AI-powered interview preparation:
  - POST /questions   – generate likely interview questions for a specific role
  - POST /company-brief – generate a company research brief
"""

import os
import json
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings

# ---------------------------------------------------------------------------
# Gemini client (same pattern as resume.py / llm_scorer.py)
# ---------------------------------------------------------------------------
try:
    from google import genai

    _api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    _client = genai.Client(api_key=_api_key) if _api_key else None
except ImportError:
    _client = None

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM output, even if wrapped in markdown fences."""
    match = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class QuestionsRequest(BaseModel):
    """Payload for the interview-questions endpoint."""
    job_title: str = Field(..., min_length=1, description="Title of the role")
    company: str = Field(..., min_length=1, description="Company name")
    job_description: str = Field(..., min_length=1, description="Full job description text")
    resume_profile: dict = Field(
        default_factory=dict,
        description="Parsed resume profile (output of /resume/upload)",
    )


class QuestionItem(BaseModel):
    question: str
    type: str  # behavioral | technical | situational
    tip: str


class QuestionsResponse(BaseModel):
    questions: list[QuestionItem]


class CompanyBriefRequest(BaseModel):
    """Payload for the company-brief endpoint."""
    company: str = Field(..., min_length=1, description="Company name")
    job_title: str = Field(..., min_length=1, description="Title of the role")


class CompanyBrief(BaseModel):
    overview: str
    culture: str
    recentNews: list[str]
    interviewTips: list[str]
    glassdoorSentiment: str


class CompanyBriefResponse(BaseModel):
    brief: CompanyBrief


# ---------------------------------------------------------------------------
# POST /questions
# ---------------------------------------------------------------------------

@router.post("/questions", response_model=QuestionsResponse)
async def generate_interview_questions(request: QuestionsRequest):
    """
    Generate 8-10 likely interview questions for a specific role using
    Gemini 2.0 Flash.  Questions are tailored to the job description,
    company, and candidate's resume profile.
    """
    if not _client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API is not configured. Set GEMINI_API_KEY in .env.",
        )

    # Build a concise summary of the candidate profile for the prompt
    profile = request.resume_profile
    profile_block = ""
    if profile:
        skills = ", ".join(profile.get("skills", [])[:15])
        profile_block = f"""
## Candidate Profile
- Current Role: {profile.get('currentRole', 'N/A')}
- Years of Experience: {profile.get('yearsExperience', 'N/A')}
- Key Skills: {skills or 'N/A'}
- Education: {profile.get('education', 'N/A')}
- Summary: {profile.get('summary', 'N/A')}
"""

    prompt = f"""You are an expert interview coach and hiring-manager simulator.

## Task
Generate 8 to 10 interview questions that a candidate is likely to face when
interviewing for the role described below.  Mix behavioral, technical, and
situational questions.  Tailor the questions to the company culture and the
specific requirements of the job description.

## Role Details
- **Job Title:** {request.job_title}
- **Company:** {request.company}

## Job Description
{request.job_description[:6000]}
{profile_block}
## Response Format
Return ONLY a valid JSON object (no markdown, no explanation outside the JSON):
{{
    "questions": [
        {{
            "question": "<the interview question>",
            "type": "behavioral" | "technical" | "situational",
            "tip": "<brief one-sentence suggestion on how to approach answering>"
        }}
    ]
}}

Generate between 8 and 10 questions.  Make them specific to the role, not
generic.  Each tip should be actionable and concise."""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        data = _extract_json(response.text)

        # Validate the expected shape
        if "questions" not in data or not isinstance(data["questions"], list):
            raise ValueError("Gemini response missing 'questions' list")

        return QuestionsResponse(
            questions=[
                QuestionItem(
                    question=q.get("question", ""),
                    type=q.get("type", "behavioral"),
                    tip=q.get("tip", ""),
                )
                for q in data["questions"]
            ]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interview questions: {e}",
        )


# ---------------------------------------------------------------------------
# POST /company-brief
# ---------------------------------------------------------------------------

@router.post("/company-brief", response_model=CompanyBriefResponse)
async def generate_company_brief(request: CompanyBriefRequest):
    """
    Generate a company research brief using Gemini 2.0 Flash.
    Covers overview, culture, recent news, interview tips, and sentiment.
    """
    if not _client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API is not configured. Set GEMINI_API_KEY in .env.",
        )

    prompt = f"""You are a career-research analyst.  Compile a concise company
research brief that a candidate can review before an interview.

## Company: {request.company}
## Role: {request.job_title}

## Response Format
Return ONLY a valid JSON object (no markdown, no explanation outside the JSON):
{{
    "overview": "<2-3 sentence company overview including industry, size, and mission>",
    "culture": "<2-3 sentences on company culture, values, and work environment>",
    "recentNews": [
        "<recent headline or development 1>",
        "<recent headline or development 2>",
        "<recent headline or development 3>"
    ],
    "interviewTips": [
        "<actionable tip 1 specific to this company>",
        "<actionable tip 2>",
        "<actionable tip 3>",
        "<actionable tip 4>"
    ],
    "glassdoorSentiment": "<brief summary of typical employee sentiment – overall rating, pros/cons themes>"
}}

Be specific and factual.  If you are unsure about recent news, note that the
information should be verified.  Aim for 3-5 items in each list."""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        data = _extract_json(response.text)

        brief = CompanyBrief(
            overview=data.get("overview", ""),
            culture=data.get("culture", ""),
            recentNews=data.get("recentNews", []),
            interviewTips=data.get("interviewTips", []),
            glassdoorSentiment=data.get("glassdoorSentiment", ""),
        )
        return CompanyBriefResponse(brief=brief)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate company brief: {e}",
        )
