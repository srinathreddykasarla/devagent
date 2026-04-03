from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["pipelines"])


@router.get("/")
async def list_pipelines() -> list:
    return []


@router.post("/{pipeline_id}/run")
async def run_pipeline(pipeline_id: str) -> dict:
    return {"status": "not_implemented", "pipeline_id": pipeline_id}
