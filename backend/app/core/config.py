import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    GEMINI_API_KEY: str | None = None
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
