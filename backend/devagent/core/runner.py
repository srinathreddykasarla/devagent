from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from devagent.core.event_bus import EventBus
from devagent.models import RunStatus, TaskRun
from devagent.pipelines.registry import PipelineRegistry

logger = logging.getLogger(__name__)


async def run_pipeline(
    pipeline_name: str,
    params: dict,
    task_id: str | None,
    pipelines: PipelineRegistry,
    db: AsyncSession,
    event_bus: EventBus | None = None,
) -> TaskRun:
    """Execute a pipeline and record the run in the database."""
    run = TaskRun(
        id=uuid4().hex,
        task_id=task_id or "manual",
        status=RunStatus.RUNNING,
        started_at=datetime.now(UTC),
        logs=[],
    )
    db.add(run)
    await db.commit()

    channel = f"run:{run.id}:logs"

    async def log(msg: str, level: str = "info") -> None:
        entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": level,
            "message": msg,
        }
        run.logs.append(entry)
        if event_bus:
            await event_bus.publish(channel, entry)

    try:
        pipeline = pipelines.get(pipeline_name)
        await log(f"Starting pipeline '{pipeline_name}'")

        result = await pipeline.run(params)

        run.status = RunStatus.SUCCESS
        run.result = result
        run.finished_at = datetime.now(UTC)
        await log(f"Pipeline '{pipeline_name}' completed successfully")

    except Exception as e:
        run.status = RunStatus.FAILED
        run.error = str(e)
        run.finished_at = datetime.now(UTC)
        await log(f"Pipeline '{pipeline_name}' failed: {e}", level="error")
        logger.error("Pipeline '%s' failed: %s", pipeline_name, e)

    await db.commit()
    return run
