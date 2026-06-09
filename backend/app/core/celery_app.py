from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["app.workers.tasks"]
)

celery_app.conf.task_routes = {
    "app.workers.tasks.scrape_*": "main-queue"
}
