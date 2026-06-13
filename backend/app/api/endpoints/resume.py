import os
import json
import re
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from PyPDF2 import PdfReader
import io

from app.core.config import settings
from app.agents.resume_optimizer import optimize_resume_for_job

router = APIRouter()

# Try to use Gemini for smart resume parsing
try:
    from google import genai
    _api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    _client = genai.Client(api_key=_api_key) if _api_key else None
except ImportError:
    _client = None


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM output."""
    match = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


def _parse_resume_with_gemini(resume_text: str) -> dict:
    """Use Gemini to intelligently parse a resume into a structured profile."""
    if not _client:
        return _parse_resume_keyword(resume_text)

    prompt = f"""You are an expert resume parser. Analyze the following resume and extract a structured profile.

## Resume Text
{resume_text[:8000]}

## Instructions
Extract the following information from the resume. Be thorough and accurate.

Return ONLY a valid JSON object:
{{
    "name": "<full name>",
    "currentRole": "<most recent job title>",
    "targetTitle": "<best-fit job title based on their experience>",
    "yearsExperience": <estimated total years of professional experience as integer>,
    "skills": ["<skill1>", "<skill2>", ...],
    "education": "<highest degree and institution>",
    "summary": "<2-3 sentence professional summary>",
    "preferredLocations": ["<location1>"],
    "industries": ["<industry1>", "<industry2>"]
}}"""

    try:
        response = _client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        data = _extract_json(response.text)
        return data
    except Exception as e:
        print(f"Gemini resume parsing failed: {e}")
        return _parse_resume_keyword(resume_text)


def _parse_resume_keyword(resume_text: str) -> dict:
    """Fallback keyword-based resume parsing."""
    text_lower = resume_text.lower()

    # Common tech skills to look for
    skill_keywords = [
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust",
        "React", "Angular", "Vue", "Next.js", "Node.js", "Express",
        "FastAPI", "Django", "Flask", "Spring Boot",
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
        "TensorFlow", "PyTorch", "LLMs", "LangChain", "RAG",
        "SQL", "NoSQL", "GraphQL", "REST API", "gRPC",
        "Git", "CI/CD", "Linux", "Agile", "Scrum",
        "Data Science", "Data Engineering", "ETL", "Spark", "Kafka",
        "HTML", "CSS", "Tailwind", "SASS",
        "Figma", "UI/UX", "Product Design",
    ]

    found_skills = [s for s in skill_keywords if s.lower() in text_lower]

    return {
        "name": "Resume User",
        "currentRole": "Software Professional",
        "targetTitle": "Software Engineer",
        "yearsExperience": 3,
        "skills": found_skills[:15],
        "education": "Not parsed (Gemini API needed for deep parsing)",
        "summary": f"Resume parsed with keyword extraction. Found {len(found_skills)} matching skills.",
        "preferredLocations": ["Remote"],
        "industries": ["Tech"],
    }


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume (PDF) and extract a structured profile using Gemini AI.
    Returns the parsed profile data that can be used for job matching.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_types = [".pdf"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Please upload a PDF file."
        )

    # Read file
    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # Extract text
    try:
        resume_text = _extract_text_from_pdf(contents)
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from PDF. Please ensure it's not a scanned image."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing PDF: {str(e)}")

    # Parse with AI
    profile = _parse_resume_with_gemini(resume_text)

    return {
        "status": "success",
        "profile": profile,
        "textLength": len(resume_text),
        "method": "gemini" if _client else "keyword",
    }


class OptimizeRequest(BaseModel):
    resume_profile: dict
    job_description: str

@router.post("/optimize")
async def optimize_resume(request: OptimizeRequest):
    """
    Optimizes a resume against a job description, highlighting ATS keywords 
    and suggesting bullet point rewrites.
    """
    if not request.job_description:
        raise HTTPException(status_code=400, detail="Job description is required")
        
    result = optimize_resume_for_job(request.resume_profile, request.job_description)
    return result
