from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from devagent.api.deps import get_db, get_event_bus, get_pipelines
from devagent.core.event_bus import EventBus
from devagent.core.runner import run_pipeline as execute_pipeline_run
from devagent.pipelines.registry import PipelineRegistry

logger = logging.getLogger(__name__)
router = APIRouter(tags=["pipelines"])


class PipelineRunRequest(BaseModel):
    params: dict = {}


@router.get("/")
async def list_pipelines(
    pipelines: PipelineRegistry | None = Depends(get_pipelines),
) -> list:
    if pipelines is None:
        return []
    return pipelines.list_all()


@router.post("/{pipeline_id}/run")
async def run_pipeline(
    pipeline_id: str,
    body: PipelineRunRequest,
    pipelines: PipelineRegistry | None = Depends(get_pipelines),
    db: AsyncSession = Depends(get_db),
    event_bus: EventBus | None = Depends(get_event_bus),
) -> dict:
    if pipelines is None:
        raise HTTPException(status_code=503, detail="Pipeline system not initialized")
    try:
        pipelines.get(pipeline_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    task_run = await execute_pipeline_run(
        pipeline_name=pipeline_id,
        params=body.params,
        task_id=None,
        pipelines=pipelines,
        db=db,
        event_bus=event_bus,
    )

    return {
        "run_id": task_run.id,
        "status": task_run.status.value,
        "result": task_run.result,
        "error": task_run.error,
    }
