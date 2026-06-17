import os
import json
import re
import logging
from typing import Any, Dict
from fastapi import HTTPException
from app.core.config import settings

try:
    from google import genai
    _api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    client = genai.Client(api_key=_api_key) if _api_key else None
except ImportError:
    client = None

logger = logging.getLogger(__name__)


def extract_json_from_llm(text: str) -> Dict[str, Any]:
    """Robustly extract JSON from LLM output, even if wrapped in markdown fences."""
    # Try to find a JSON block inside ```json ... ```
    match = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if match:
        text = match.group(1).strip()

    # Use raw_decode to find the first valid JSON object
    decoder = json.JSONDecoder()
    # Find the first '{' or '['
    for i, ch in enumerate(text):
        if ch in ('{', '['):
            try:
                result, _ = decoder.raw_decode(text, i)
                if isinstance(result, dict):
                    return result
                # If it decoded a list, wrap it or continue
            except json.JSONDecodeError:
                continue

    # Fallback: try the whole text
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from LLM output: {e}. Output was: {text[:200]}...")


def generate_json_response(prompt: str, model: str = "gemini-2.0-flash", temperature: float = 0.0) -> Dict[str, Any]:
    """Generate content from Gemini and extract JSON safely."""
    if not client:
        raise HTTPException(
            status_code=503,
            detail="AI service unavailable. Ensure GEMINI_API_KEY is set.",
        )

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=temperature,
            ),
        )
        return extract_json_from_llm(response.text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM Generation Failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="An internal error occurred while processing the AI request.",
        )
