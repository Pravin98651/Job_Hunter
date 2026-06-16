import os
import json
import re
from typing import Any, Dict
from pydantic import BaseModel
from fastapi import HTTPException
from app.core.config import settings

try:
    from google import genai
    _api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    client = genai.Client(api_key=_api_key) if _api_key else None
except ImportError:
    client = None

def extract_json_from_llm(text: str) -> Dict[str, Any]:
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
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from LLM output: {e}. Output was: {text[:200]}...")

def generate_json_response(prompt: str, model: str = "gemini-2.0-flash", temperature: float = 0.0) -> Dict[str, Any]:
    """Generate content from Gemini and extract JSON safely."""
    if not client:
        raise RuntimeError("Gemini API client not configured. Ensure GEMINI_API_KEY is set.")
    
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=temperature,
            ),
        )
        return extract_json_from_llm(response.text)
    except Exception as e:
        import logging
        logging.error(f"LLM Generation Failed: {e}", exc_info=True)
        raise RuntimeError("AI model generation failed.") from e
