import os
import uuid
from pathlib import Path

# Base directory for mock object storage
STORAGE_DIR = Path(__file__).parent.parent.parent / "object_storage"

def get_storage_dir() -> Path:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR

def upload_file(file_bytes: bytes, original_filename: str) -> str:
    """
    Saves a file to local object storage and returns the object_key.
    """
    storage_dir = get_storage_dir()
    ext = os.path.splitext(original_filename)[1]
    object_key = f"{uuid.uuid4()}{ext}"
    
    file_path = storage_dir / object_key
    with open(file_path, "wb") as f:
        f.write(file_bytes)
        
    return object_key

def download_file(object_key: str) -> bytes | None:
    """
    Retrieves a file from local object storage by its object_key.
    Returns bytes or None if not found.
    """
    storage_dir = get_storage_dir()
    file_path = storage_dir / object_key
    if file_path.exists():
        with open(file_path, "rb") as f:
            return f.read()
    return None
