"""
Deduplication service.

Provides two layers of dedup to guard against duplicate job listings:

1. Semantic dedup (primary): Compares a new job description against all existing
   embeddings using pgvector cosine distance. Requires Gemini API.

2. external_id dedup (fallback): When Gemini is unavailable, checks whether a
   listing with the same (source, external_id) already exists. This is enforced
   as a UniqueConstraint at the DB level, but checking here avoids an unnecessary
   round-trip that would fail with an IntegrityError.

Usage:
    is_duplicate(db, job_description)  -> bool
    generate_embedding(text)           -> list[float]
"""

import logging
from sqlalchemy.orm import Session

from app.models.job import JobListing
from app.core.llm import client as _client

logger = logging.getLogger(__name__)


def generate_embedding(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding using Gemini text-embedding-004.
    Returns a zero vector if the API is unavailable or on error.
    """
    if not _client or not text:
        return [0.0] * 768

    try:
        response = _client.models.embed_content(
            model="text-embedding-004",
            contents=text,
        )
        return response.embeddings[0].values
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}", exc_info=True)
        return [0.0] * 768


def is_duplicate(db: Session, description: str, source: str = "", external_id: str = "", threshold: float = 0.92) -> bool:
    """
    Returns True if a semantically or structurally similar job already exists in the DB.

    Strategy:
    - If Gemini is available: cosine similarity check via pgvector.
    - If Gemini is unavailable: falls back to (source, external_id) existence check
      when those fields are provided.
    - If neither is available: returns False (allow insert, DB constraint is the guard).
    """
    if _client and description:
        # ── Semantic dedup via vector similarity ──────────────────────────────
        embedding = generate_embedding(description)
        if any(v != 0.0 for v in embedding):
            distance_threshold = 1.0 - threshold
            try:
                similar = (
                    db.query(JobListing)
                    .filter(JobListing.embedding.cosine_distance(embedding) < distance_threshold)
                    .first()
                )
                if similar:
                    logger.debug(f"Semantic duplicate detected (threshold={threshold})")
                    return True
            except Exception as e:
                logger.warning(f"Vector similarity query failed, falling back to external_id check: {e}")
        # If embedding is all zeros (Gemini returned error), fall through to external_id check

    # ── external_id fallback dedup ────────────────────────────────────────────
    if source and external_id:
        exists = (
            db.query(JobListing.id)
            .filter(JobListing.source == source, JobListing.external_id == external_id)
            .first()
        )
        if exists:
            logger.debug(f"external_id duplicate detected: {source}/{external_id}")
            return True

    return False
