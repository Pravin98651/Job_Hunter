import os
import json
import re
from pydantic import BaseModel, Field
from app.core.config import settings

# Use the new google.genai SDK
from google import genai

# Configure the client with the API key from settings
_api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
_client = genai.Client(api_key=_api_key) if _api_key else None


class JobScoreResult(BaseModel):
    match_score: int = Field(description="Match score from 0 to 100")
    match_reason: str = Field(description="Plain-English explanation of why the job fits or doesn't")
    skill_gaps: list[str] = Field(description="List of skills in the JD not found in the user profile")
    salary_fit: bool = Field(description="Whether salary range overlaps preference")
    location_fit: bool = Field(description="Whether location matches preference")


def _extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM output, even if wrapped in markdown fences."""
    # Try to find a JSON block inside ```json ... ```
    match = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    # Try to find first { ... } block
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


def score_job_listing(job_description: str, user_profile: dict) -> JobScoreResult:
    """
    Scores a job listing against a user profile using Gemini API.
    Uses a detailed prompt that considers skills, experience, location, and salary.
    """
    if not _client:
        print("WARNING: Gemini API client not configured. Returning mock score.")
        return _mock_score(job_description, user_profile)

    prompt = f"""You are an expert AI career coach and recruiter. Your task is to evaluate how well a Job Description matches a User Profile.

## User Profile
- **Target Title:** {user_profile.get('title', 'Not specified')}
- **Core Skills:** {', '.join(user_profile.get('skills', []))}
- **Years of Experience:** {user_profile.get('experience_years', 'Not specified')}
- **Minimum Salary Expectation:** ${user_profile.get('salary_expectation_min', 'Not specified'):,}
- **Preferred Location:** {user_profile.get('preferred_location', 'Flexible')}

## Job Description
{job_description[:6000]}

## Scoring Instructions
Evaluate the job against the user profile on these dimensions:
1. **Skills Match (40%)**: How many of the user's core skills are required or mentioned in the JD? Penalize heavily if the JD requires skills the user completely lacks (e.g., a Java-heavy role for a Python developer).
2. **Title & Seniority Match (25%)**: Does the job title and level match what the user is looking for? A "Senior" role for someone with 3 years experience should score lower.
3. **Location Match (15%)**: Does the job location match the user's preference? Remote-friendly roles should score higher for remote-preferring users.
4. **Salary Match (10%)**: If salary info is available, does it meet the user's minimum? If no salary info, assume neutral.
5. **Growth & Culture (10%)**: Does the role offer growth opportunities, interesting tech stack, or align with the user's career trajectory?

## Strict Anti-Hallucination Constraints
- DO NOT invent or hallucinate any skills not explicitly present in the user profile or job description.
- Be highly objective. If there is a gap, state it clearly.
- Rely ONLY on the provided text.

## Response Format
Return ONLY a valid JSON object (no markdown, no explanation outside the JSON):
{{
    "match_score": <integer 0-100>,
    "match_reason": "<2-3 sentence explanation of why this is or isn't a good fit>",
    "skill_gaps": ["<skill1 from JD not in user profile>", "<skill2>"],
    "salary_fit": <true if salary meets expectations or unknown, false otherwise>,
    "location_fit": <true if location matches preference, false otherwise>
}}"""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.0,
            ),
        )
        data = _extract_json(response.text)
        # Clamp score to 0-100
        data['match_score'] = max(0, min(100, int(data.get('match_score', 50))))
        return JobScoreResult(**data)
    except Exception as e:
        print(f"Gemini scoring failed: {e}")
        return _mock_score(job_description, user_profile)


def _mock_score(job_description: str, user_profile: dict) -> JobScoreResult:
    """Keyword-based fallback scoring when Gemini is unavailable."""
    desc_lower = job_description.lower()
    user_skills = [s.lower() for s in user_profile.get('skills', [])]

    matched = [s for s in user_skills if s in desc_lower]
    missing = [s for s in user_skills if s not in desc_lower]
    skill_ratio = len(matched) / max(len(user_skills), 1)

    # Title similarity bonus
    title_target = user_profile.get('title', '').lower()
    title_bonus = 15 if title_target and title_target in desc_lower else 0

    score = int(skill_ratio * 70 + title_bonus + 10)  # base 10 + up to 70 for skills + 15 for title
    score = max(10, min(95, score))

    reason_parts = []
    if matched:
        reason_parts.append(f"Matches your skills in {', '.join(matched[:3])}")
    if missing:
        reason_parts.append(f"Missing: {', '.join(missing[:3])}")
    if title_bonus:
        reason_parts.append("Title aligns well with your target role")

    return JobScoreResult(
        match_score=score,
        match_reason=". ".join(reason_parts) + "." if reason_parts else "Basic keyword analysis — configure Gemini API for deeper insights.",
        skill_gaps=[s.title() for s in missing[:5]],
        salary_fit=True,
        location_fit=True,
    )
