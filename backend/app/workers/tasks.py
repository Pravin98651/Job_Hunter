"""
Legacy worker stubs — Celery was replaced by APScheduler.

This file is kept for reference but is NOT imported anywhere.
The scraping pipeline runs via app/services/scheduler.py (APScheduler)
and app/agents/orchestrator.py (LangGraph).
"""

# If Celery support is needed in the future, add:
# from app.core.celery_app import celery_app
# and configure a Redis/RabbitMQ broker in settings.
