import json
import logging
from pydantic import BaseModel, Field
from app.core.llm import client as _client, generate_json_response

logger = logging.getLogger(__name__)


class RewriteSuggestion(BaseModel):
    original_concept: str = Field(description="The general idea or skill from the user's resume")
    suggested_bullet: str = Field(description="A highly optimized bullet point tailored specifically for the job description")
    reasoning: str = Field(description="Why this rewrite makes the resume more ATS friendly for this specific job")

class ResumeOptimizationResult(BaseModel):
    missing_keywords: list[str] = Field(description="List of exact keywords from the JD that the resume is missing")
    matched_keywords: list[str] = Field(description="List of important keywords the user already has")
    tailored_summary: str = Field(description="A suggested professional summary tailored perfectly to the JD")
    bullet_suggestions: list[RewriteSuggestion] = Field(description="3-5 suggested bullet point rewrites to better match the job")

def optimize_resume_for_job(resume_profile: dict, job_description: str) -> ResumeOptimizationResult:
    """
    Uses Gemini to analyze a user's resume profile against a specific job description
    and generates an ATS-optimized tailoring report.
    """
    if not _client:
        # Fallback empty result if no API key
        return ResumeOptimizationResult(
            missing_keywords=["API Key missing"],
            matched_keywords=[],
            tailored_summary="Please provide a Gemini API key.",
            bullet_suggestions=[]
        )
        
    prompt = f"""
    You are an expert technical recruiter and ATS (Applicant Tracking System) optimizer.
    
    I have a candidate's resume profile and a specific job description. 
    I need you to analyze them and tell me EXACTLY how to tailor the resume to score a 100% match on the ATS.
    
    ### Candidate Profile:
    {json.dumps(resume_profile, indent=2)}
    
    ### Job Description:
    {job_description}
    
    Provide:
    1. The exact ATS keywords from the JD the candidate is missing.
    2. The exact ATS keywords from the JD the candidate already has.
    3. A highly tailored 2-sentence Professional Summary they should use at the top of their resume for this specific job.
    4. 3 to 5 highly optimized bullet points they should add or replace in their experience section to explicitly hit the JD's requirements, incorporating the missing keywords logically based on their background.
    
    Return ONLY a valid JSON object with these fields:
    {{
        "missing_keywords": ["keyword1", "keyword2"],
        "matched_keywords": ["keyword1", "keyword2"],
        "tailored_summary": "...",
        "bullet_suggestions": [
            {{
                "original_concept": "...",
                "suggested_bullet": "...",
                "reasoning": "..."
            }}
        ]
    }}
    """
    
    try:
        data = generate_json_response(prompt, temperature=0.2)
        return ResumeOptimizationResult(**data)
    except Exception as e:
        logger.error(f"Error during resume optimization: {e}", exc_info=True)
        return ResumeOptimizationResult(
            missing_keywords=["Error analyzing resume"],
            matched_keywords=[],
            tailored_summary="An error occurred while optimizing.",
            bullet_suggestions=[]
        )
