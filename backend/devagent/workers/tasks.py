from __future__ import annotations

from devagent.workers.celery_app import celery_app


@celery_app.task(name="devagent.health_check")
def health_check() -> dict:
    """Simple ping task to verify worker connectivity."""
    return {"status": "ok", "worker": "devagent"}


@celery_app.task(name="devagent.run_pipeline", bind=True)
def run_pipeline_task(self, pipeline_name: str, params: dict, task_id: str | None = None) -> dict:
    """Celery task that executes a pipeline asynchronously.

    In production, this runs the pipeline in an async event loop within the Celery worker.
    For now, this is a placeholder that will be fleshed out when we add full Celery integration.
    """
    import asyncio

    async def _run():
        from devagent.config import get_settings
        from devagent.database import init_db

        settings = get_settings()
        await init_db(settings.database_url)

        # Note: In production, the pipeline registry would be pre-initialized
        # This is a simplified version for the Celery worker context
        return {"status": "submitted", "pipeline": pipeline_name, "task_id": task_id}

    return asyncio.run(_run())
