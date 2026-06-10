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
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(text)
        return JobScoreResult(**data)
    except Exception as e:
        print(f"Failed to score job (API Key missing or invalid?): {e}")
        # Fallback to a mock score if Gemini API is not configured
        return JobScoreResult(
            match_score=85, 
            match_reason="Mock Score: Looks like a solid match based on title and keywords, but Gemini API is not configured to do deep semantic analysis.", 
            skill_gaps=["Cloud Infrastructure (Mock)"], 
            salary_fit=True, 
            location_fit=True
        )
