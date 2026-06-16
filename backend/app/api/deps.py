from fastapi import Header, HTTPException
from typing import Optional
from uuid import UUID

def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> UUID:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header missing")
    try:
        return UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid X-User-ID header format")
