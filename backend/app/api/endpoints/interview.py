"""
Interview Prep endpoints.

Provides AI-powered interview preparation:
  - POST /questions         – generate likely interview questions for a specific role
  - POST /company-brief     – generate a company research brief
  - POST /start-session     – initialize a new voice mock interview session
  - POST /evaluate-answer   – evaluate a spoken answer and return the next question
  - GET  /history           – retrieve past sessions with AI progress comparison
"""

import logging
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps import get_current_user_id
from app.db.session import get_db
from app.core.llm import generate_json_response, extract_json_from_llm, client as _llm_client
from app.models.interview import MockInterviewSession, MockInterviewQA

router = APIRouter()
logger = logging.getLogger(__name__)

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


class StartSessionRequest(BaseModel):
    job_title: str = Field(..., min_length=1)
    company: str = Field(..., min_length=1)
    job_description: str = Field(default="", description="Optional job description for tailoring")


class StartSessionResponse(BaseModel):
    session_id: str
    question: str


class EvaluateAnswerRequest(BaseModel):
    session_id: str = Field(..., description="UUID of the active session")
    answer: str = Field(..., min_length=1, description="Transcribed spoken answer")


class EvaluateAnswerResponse(BaseModel):
    feedback: str
    score: int
    next_question: Optional[str] = None
    is_complete: bool = False


class QARecord(BaseModel):
    question: str
    user_answer: Optional[str]
    feedback: Optional[str]
    score: Optional[int]
    created_at: Optional[str]


class SessionRecord(BaseModel):
    session_id: str
    job_title: str
    company: str
    overall_score: Optional[int]
    summary: Optional[str]
    qa_count: int
    created_at: str


class HistoryResponse(BaseModel):
    sessions: list[SessionRecord]
    progress_summary: Optional[str] = None


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


# ---------------------------------------------------------------------------
# Helper: generate the opening interview question
# ---------------------------------------------------------------------------

def _generate_opening_question(job_title: str, company: str, job_description: str) -> str:
    """Generate an opening warm-up behavioral question for the mock interview."""
    prompt = f"""You are a professional interviewer at {company} conducting an interview for the {job_title} role.

Start the mock interview with ONE warm, professional opening question. It should be a classic opener that lets the candidate introduce themselves, like "Tell me about yourself" — but make it specific and relevant to the {job_title} role.

Return ONLY a JSON object:
{{"question": "<your opening interview question>"}}
"""
    try:
        data = generate_json_response(prompt)
        return data.get("question", f"Tell me about yourself and why you're excited about the {job_title} role at {company}.")
    except Exception:
        return f"Tell me about yourself and why you're excited about the {job_title} role at {company}."


# ---------------------------------------------------------------------------
# POST /start-session
# ---------------------------------------------------------------------------

@router.post("/start-session", response_model=StartSessionResponse)
async def start_interview_session(
    request: StartSessionRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Initialize a new mock interview session. Creates a DB record and returns
    the first interview question to kick off the conversation.
    """
    # Create the session record
    session = MockInterviewSession(
        user_id=current_user_id,
        job_title=request.job_title,
        company=request.company,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate the opening question
    opening_question = _generate_opening_question(
        request.job_title, request.company, request.job_description
    )

    # Save the first QA entry (answer will be filled in when user responds)
    qa = MockInterviewQA(
        session_id=session.id,
        question=opening_question,
    )
    db.add(qa)
    db.commit()

    return StartSessionResponse(
        session_id=str(session.id),
        question=opening_question,
    )


# ---------------------------------------------------------------------------
# POST /evaluate-answer
# ---------------------------------------------------------------------------

MAX_QUESTIONS_PER_SESSION = 8

@router.post("/evaluate-answer", response_model=EvaluateAnswerResponse)
async def evaluate_answer(
    request: EvaluateAnswerRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Process a spoken answer, evaluate it with Gemini, save the QA pair,
    and generate the next contextual follow-up question.
    """
    try:
        session_uuid = UUID(request.session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format.")

    # Fetch the session
    session = db.query(MockInterviewSession).filter(
        MockInterviewSession.id == session_uuid,
        MockInterviewSession.user_id == current_user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Fetch all past QAs in order
    past_qas = db.query(MockInterviewQA).filter(
        MockInterviewQA.session_id == session_uuid
    ).order_by(MockInterviewQA.created_at).all()

    # The last QA entry is the current question (created in start-session or previous evaluate-answer)
    if not past_qas:
        raise HTTPException(status_code=400, detail="No active question found for this session.")

    current_qa = past_qas[-1]
    current_question = current_qa.question

    # Build conversation history for the prompt
    history_lines = []
    for qa in past_qas[:-1]:  # Exclude the current question
        history_lines.append(f"Q: {qa.question}")
        history_lines.append(f"A: {qa.user_answer or '(no answer)'}")
        history_lines.append(f"Score: {qa.score or 'N/A'}/10")
        history_lines.append("")

    history_block = "\n".join(history_lines) if history_lines else "This is the first question."
    question_count = len(past_qas)
    is_last_question = question_count >= MAX_QUESTIONS_PER_SESSION

    prompt = f"""You are an expert interviewer conducting a real mock interview for the role of {session.job_title} at {session.company}.

## Interview History So Far
{history_block}

## Current Question
{current_question}

## Candidate's Answer
{request.answer}

## Your Task
1. Evaluate the candidate's answer. Be constructive, honest, and specific. Reference the STAR method (Situation, Task, Action, Result) where relevant.
2. Score the answer from 1-10 based on clarity, relevance, and depth.
3. {"Since this is the final question, provide a closing summary instead of a follow-up question." if is_last_question else "Generate a smart, contextual follow-up question that digs deeper into their answer OR transitions to the next important topic for this role."}

Return ONLY a valid JSON object:
{{
    "feedback": "<2-3 sentence constructive feedback on the answer>",
    "score": <integer 1-10>,
    "next_question": {"null" if is_last_question else '"<the next interview question>"'}
}}
"""

    try:
        data = generate_json_response(prompt)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to evaluate interview answer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to evaluate answer.")

    feedback = data.get("feedback", "Good effort. Keep practicing!")
    score = int(data.get("score", 5))
    next_question = data.get("next_question") if not is_last_question else None

    # Update the current QA record with the answer and feedback
    current_qa.user_answer = request.answer
    current_qa.feedback = feedback
    current_qa.score = score
    db.commit()

    # If not the last question, create the next QA entry
    if next_question and not is_last_question:
        next_qa = MockInterviewQA(
            session_id=session_uuid,
            question=next_question,
        )
        db.add(next_qa)
        db.commit()
    else:
        # Session is complete — compute overall score and save summary
        all_qas = db.query(MockInterviewQA).filter(
            MockInterviewQA.session_id == session_uuid,
            MockInterviewQA.score.isnot(None),
        ).all()
        if all_qas:
            overall_score = round(sum(q.score for q in all_qas) / len(all_qas))
            session.overall_score = overall_score
        session.completed_at = datetime.now(timezone.utc)
        db.commit()

    return EvaluateAnswerResponse(
        feedback=feedback,
        score=score,
        next_question=next_question,
        is_complete=is_last_question,
    )


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------

@router.get("/history", response_model=HistoryResponse)
async def get_interview_history(
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Retrieve all past mock interview sessions for the user.
    If they have 2+ sessions, Gemini generates a progress comparison summary.
    """
    sessions = db.query(MockInterviewSession).filter(
        MockInterviewSession.user_id == current_user_id,
    ).order_by(MockInterviewSession.created_at.desc()).all()

    session_records = []
    for s in sessions:
        qa_count = db.query(MockInterviewQA).filter(
            MockInterviewQA.session_id == s.id,
            MockInterviewQA.user_answer.isnot(None),
        ).count()
        session_records.append(SessionRecord(
            session_id=str(s.id),
            job_title=s.job_title,
            company=s.company,
            overall_score=s.overall_score,
            summary=s.summary,
            qa_count=qa_count,
            created_at=s.created_at.isoformat() if s.created_at else "",
        ))

    # Generate an AI progress summary if there are 2+ completed sessions
    progress_summary = None
    completed_sessions = [s for s in sessions if s.overall_score is not None]
    if len(completed_sessions) >= 2:
        latest = completed_sessions[0]
        previous = completed_sessions[1]
        latest_qas = db.query(MockInterviewQA).filter(
            MockInterviewQA.session_id == latest.id,
            MockInterviewQA.feedback.isnot(None),
        ).all()
        prev_qas = db.query(MockInterviewQA).filter(
            MockInterviewQA.session_id == previous.id,
            MockInterviewQA.feedback.isnot(None),
        ).all()

        latest_feedbacks = "\n".join([f"- {q.feedback}" for q in latest_qas[:5]])
        prev_feedbacks = "\n".join([f"- {q.feedback}" for q in prev_qas[:5]])

        prompt = f"""You are a career coach comparing two mock interview sessions.

## Previous Session ({previous.job_title} at {previous.company})
- Overall Score: {previous.overall_score}/10
- Feedback Highlights:
{prev_feedbacks or "No feedback recorded."}

## Latest Session ({latest.job_title} at {latest.company})
- Overall Score: {latest.overall_score}/10
- Feedback Highlights:
{latest_feedbacks or "No feedback recorded."}

Write a 2-3 sentence encouraging but honest progress report for the candidate.
Mention specific improvements or areas to work on. Be specific and motivating.

Return ONLY a JSON object:
{{"summary": "<your progress report>"}}
"""
        try:
            result = generate_json_response(prompt)
            progress_summary = result.get("summary")
        except Exception:
            progress_summary = f"You scored {latest.overall_score}/10 in your latest session, compared to {previous.overall_score}/10 previously. Keep practicing!"

    return HistoryResponse(
        sessions=session_records,
        progress_summary=progress_summary,
    )
