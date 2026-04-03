from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from devagent.api.deps import get_pipelines
from devagent.pipelines.registry import PipelineRegistry

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
) -> dict:
    if pipelines is None:
        raise HTTPException(status_code=503, detail="Pipeline system not initialized")
    try:
        pipeline = pipelines.get(pipeline_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    result = await pipeline.run(body.params)
    return result
