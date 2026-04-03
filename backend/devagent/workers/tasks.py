from __future__ import annotations

from devagent.workers.celery_app import celery_app


@celery_app.task(name="devagent.health_check")
def health_check() -> dict:
    """Simple ping task to verify worker connectivity."""
    return {"status": "ok", "worker": "devagent"}
