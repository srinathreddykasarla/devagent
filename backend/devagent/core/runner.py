from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from devagent.core.event_bus import EventBus
from devagent.models import PipelineDefinition, RunStatus, TaskRun
from devagent.orchestrator.orchestrator import run_orchestrator
from devagent.orchestrator.tool_registry import ToolRegistry
from devagent.pipelines.registry import PipelineRegistry

logger = logging.getLogger(__name__)


async def run_pipeline(
    pipeline_name: str,
    params: dict,
    task_id: str | None,
    pipelines: PipelineRegistry,
    db: AsyncSession,
    event_bus: EventBus | None = None,
    max_retries: int = 0,
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
        run.logs = [*run.logs, entry]  # Create new list to trigger SQLAlchemy change detection
        if event_bus:
            await event_bus.publish(channel, entry)

    attempt = 0
    while attempt <= max_retries:
        try:
            pipeline = pipelines.get(pipeline_name)
            await log(f"Starting pipeline '{pipeline_name}' (attempt {attempt + 1})")

            result = await pipeline.run(params)

            run.status = RunStatus.SUCCESS
            run.result = result
            run.finished_at = datetime.now(UTC)
            await log(f"Pipeline '{pipeline_name}' completed successfully")
            break

        except Exception as e:
            attempt += 1
            run.retry_count = attempt
            if attempt <= max_retries:
                await log(f"Attempt {attempt} failed: {e}. Retrying...", level="warning")
            else:
                run.status = RunStatus.FAILED
                run.error = str(e)
                run.finished_at = datetime.now(UTC)
                await log(
                    f"Pipeline '{pipeline_name}' failed after {attempt} attempts: {e}",
                    level="error",
                )
                logger.error("Pipeline '%s' failed: %s", pipeline_name, e)

    await db.commit()
    return run


async def run_orchestrated_pipeline(
    pipeline_def: PipelineDefinition,
    params: dict,
    tool_registry: ToolRegistry,
    api_key: str,
    model: str,
    db: AsyncSession,
    task_id: str | None = None,
    event_bus: EventBus | None = None,
    max_iterations: int = 20,
) -> TaskRun:
    """Execute a prompt-based pipeline via the orchestrator and record the run.

    Merges default_params with runtime params, formats them into the user message,
    and invokes the LLM tool_use agent loop.
    """
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
        run.logs = [*run.logs, entry]
        if event_bus:
            await event_bus.publish(channel, entry)

    try:
        merged_params = {**(pipeline_def.default_params or {}), **(params or {})}
        user_message = (
            f"Execute the pipeline with these parameters:\n\n"
            f"```json\n{json.dumps(merged_params, indent=2, default=str)}\n```\n\n"
            "Follow the system instructions. Use the available tools as needed. "
            "When finished, return a brief summary of what you did."
        )

        await log(f"Starting orchestrated pipeline '{pipeline_def.name}'")

        result = await run_orchestrator(
            system_prompt=pipeline_def.system_prompt,
            user_message=user_message,
            tool_registry=tool_registry,
            api_key=api_key,
            model=model,
            log_callback=log,
            max_iterations=max_iterations,
        )

        run.status = RunStatus.SUCCESS
        run.result = result
        run.finished_at = datetime.now(UTC)
        await log(f"Pipeline '{pipeline_def.name}' completed successfully")

    except Exception as e:
        run.status = RunStatus.FAILED
        run.error = str(e)
        run.finished_at = datetime.now(UTC)
        await log(f"Pipeline '{pipeline_def.name}' failed: {e}", level="error")
        logger.exception("Orchestrated pipeline '%s' failed", pipeline_def.name)

    await db.commit()
    return run
