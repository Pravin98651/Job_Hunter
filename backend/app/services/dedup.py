import numpy as np
from sqlalchemy.orm import Session
from app.models.job import JobListing

try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
except ImportError:
    model = None

def is_duplicate(db: Session, text: str, threshold: float = 0.92) -> bool:
    """
    Checks if a job listing already exists in the database by comparing semantic similarity.
    """
    if not model:
        print("sentence_transformers not installed locally, skipping dedup.")
        return False

    # Generate embedding
    embedding = model.encode(text).tolist()

    # Query for nearest neighbors using pgvector cosine distance (<=>)
    # Cosine distance = 1 - Cosine similarity.
    # Therefore, similarity > 0.92 means distance < 0.08
    distance_threshold = 1.0 - threshold
    
    # We query the database for any listing where cosine distance is less than the threshold
    similar_job = db.query(JobListing).filter(
        JobListing.embedding.cosine_distance(embedding) < distance_threshold
    ).first()

    return similar_job is not None

def generate_embedding(text: str) -> list[float]:
    if not model:
        return [0.0] * 384
    return model.encode(text).tolist()
