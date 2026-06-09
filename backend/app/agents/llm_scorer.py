import google.generativeai as genai
import os
import json
from pydantic import BaseModel, Field

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "dummy-key"))

class JobScoreResult(BaseModel):
    match_score: int = Field(description="Match score from 0 to 100")
    match_reason: str = Field(description="Plain-English explanation of why the job fits or doesn't")
    skill_gaps: list[str] = Field(description="List of skills in the JD not found in the user profile")
    salary_fit: bool = Field(description="Whether salary range overlaps preference")
    location_fit: bool = Field(description="Whether location matches preference")

def score_job_listing(job_description: str, user_profile: dict) -> JobScoreResult:
    """
    Scores a job listing against a user profile using Gemini API.
    """
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    prompt = f"""
    You are an expert AI recruiter. Evaluate the following Job Description against the User Profile.
    
    User Profile:
    {json.dumps(user_profile, indent=2)}
    
    Job Description:
    {job_description[:4000]} # Truncated for context
    
    Respond with a JSON object strictly matching the following schema:
    {{
        "match_score": int (0 to 100),
        "match_reason": "string explaining fit",
        "skill_gaps": ["skill1", "skill2"],
        "salary_fit": boolean,
        "location_fit": boolean
    }}
    """
    
    response = model.generate_content(prompt)
    
    try:
        text = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(text)
        return JobScoreResult(**data)
    except Exception as e:
        print(f"Failed to parse LLM response: {e}")
        return JobScoreResult(match_score=0, match_reason="Failed to score", skill_gaps=[], salary_fit=False, location_fit=False)
