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

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from uuid import UUID

from app.core.config import settings
from app.api.deps import get_current_user_id

from app.core.llm import generate_json_response
import logging

router = APIRouter()
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
async def generate_interview_questions(request: QuestionsRequest, current_user_id: UUID = Depends(get_current_user_id)):
    """
    Generate 8-10 likely interview questions for a specific role using
    Gemini 2.0 Flash.  Questions are tailored to the job description,
    company, and candidate's resume profile.
    """

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
generic.  Each tip should be actionable and concise.

## Strict Anti-Hallucination Constraints
- DO NOT invent details about the company that are not widely known.
- DO NOT invent skills for the candidate. If the candidate profile is empty, base questions purely on the JD.
"""

    try:
        data = generate_json_response(prompt)

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
        logging.error(f"Failed to generate interview questions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while generating interview questions.",
        )


# ---------------------------------------------------------------------------
# POST /company-brief
# ---------------------------------------------------------------------------

@router.post("/company-brief", response_model=CompanyBriefResponse)
async def generate_company_brief(request: CompanyBriefRequest, current_user_id: UUID = Depends(get_current_user_id)):
    """
    Generate a company research brief using Gemini 2.0 Flash.
    Covers overview, culture, recent news, interview tips, and sentiment.
    """

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
information should be verified.  Aim for 3-5 items in each list.

## Strict Anti-Hallucination Constraints
- DO NOT invent recent news or fake events. If no recent news is known, return an empty list or state "No major recent news found."
- Ensure the overview is factually accurate to the best of your knowledge.
"""

    try:
        data = generate_json_response(prompt)

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
        logging.error(f"Failed to generate company brief: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while generating company brief.",
        )
