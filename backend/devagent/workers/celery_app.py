from __future__ import annotations

from celery import Celery

from devagent.config import get_settings


def create_celery_app() -> Celery:
    settings = get_settings()
    app = Celery(
        "devagent",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        beat_schedule={},
    )
    app.autodiscover_tasks(["devagent.workers"])
    return app


celery_app = create_celery_app()
