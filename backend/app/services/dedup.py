from sqlalchemy.orm import Session
from app.models.job import JobListing
from app.core.llm import client as _client

def generate_embedding(text: str) -> list[float]:
    """
    Generate embedding using Gemini's text-embedding-004 model.
    """
    if not _client or not text:
        return [0.0] * 768
    
    try:
        response = _client.models.embed_content(
            model="text-embedding-004",
            contents=text
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return [0.0] * 768

def is_duplicate(db: Session, text: str, threshold: float = 0.92) -> bool:
    """
    Checks if a job listing already exists in the database by comparing semantic similarity.
    """
    if not _client:
        return False

    embedding = generate_embedding(text)
    
    # Query for nearest neighbors using pgvector cosine distance (<=>)
    distance_threshold = 1.0 - threshold
    
    similar_job = db.query(JobListing).filter(
        JobListing.embedding.cosine_distance(embedding) < distance_threshold
    ).first()

    return similar_job is not None
