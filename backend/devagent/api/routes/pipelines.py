from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from devagent.api.deps import get_db, get_event_bus, get_pipelines, get_tool_registry
from devagent.config import get_settings
from devagent.core.event_bus import EventBus
from devagent.core.runner import run_orchestrated_pipeline
from devagent.core.runner import run_pipeline as execute_pipeline_run
from devagent.models import PipelineDefinition
from devagent.orchestrator.tool_registry import ToolRegistry
from devagent.pipelines.registry import PipelineRegistry

logger = logging.getLogger(__name__)
router = APIRouter(tags=["pipelines"])


class PipelineRunRequest(BaseModel):
    params: dict = {}


class PipelineCreateRequest(BaseModel):
    name: str
    description: str = ""
    system_prompt: str
    default_params: dict = {}


class PipelineUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    default_params: dict | None = None


def _db_pipeline_to_dict(p: PipelineDefinition) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "system_prompt": p.system_prompt,
        "default_params": p.default_params or {},
        "is_builtin": p.is_builtin,
        "source": "db",
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _legacy_pipeline_to_dict(p: dict) -> dict:
    return {
        "id": p["id"],
        "name": p["name"],
        "description": p["description"],
        "system_prompt": "",
        "default_params": {},
        "is_builtin": True,
        "source": "legacy",
        "created_at": None,
        "updated_at": None,
    }


@router.get("/")
async def list_pipelines(
    legacy: PipelineRegistry | None = Depends(get_pipelines),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List pipelines from both DB (orchestrated) and legacy registry."""
    results = []
    db_names: set[str] = set()

    db_pipelines = (await db.execute(select(PipelineDefinition))).scalars().all()
    for p in db_pipelines:
        results.append(_db_pipeline_to_dict(p))
        db_names.add(p.name)

    if legacy is not None:
        for p in legacy.list_all():
            if p["id"] not in db_names:
                results.append(_legacy_pipeline_to_dict(p))

    return results


@router.get("/{pipeline_id}")
async def get_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    p = await db.get(PipelineDefinition, pipeline_id)
    if p is None:
        # Also try lookup by name for convenience
        result = await db.execute(
            select(PipelineDefinition).where(PipelineDefinition.name == pipeline_id)
        )
        p = result.scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")
    return _db_pipeline_to_dict(p)


@router.post("/")
async def create_pipeline(
    body: PipelineCreateRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    existing = (
        await db.execute(select(PipelineDefinition).where(PipelineDefinition.name == body.name))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Pipeline '{body.name}' already exists")

    p = PipelineDefinition(
        id=uuid4().hex,
        name=body.name,
        description=body.description,
        system_prompt=body.system_prompt,
        default_params=body.default_params,
        is_builtin=False,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _db_pipeline_to_dict(p)


@router.put("/{pipeline_id}")
async def update_pipeline(
    pipeline_id: str,
    body: PipelineUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    p = await db.get(PipelineDefinition, pipeline_id)
    if p is None:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

    if body.name is not None:
        p.name = body.name
    if body.description is not None:
        p.description = body.description
    if body.system_prompt is not None:
        p.system_prompt = body.system_prompt
    if body.default_params is not None:
        p.default_params = body.default_params

    await db.commit()
    await db.refresh(p)
    return _db_pipeline_to_dict(p)


@router.delete("/{pipeline_id}")
async def delete_pipeline(pipeline_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    p = await db.get(PipelineDefinition, pipeline_id)
    if p is None:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")
    if p.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot delete a built-in pipeline")
    await db.delete(p)
    await db.commit()
    return {"deleted": pipeline_id}


@router.post("/{pipeline_id}/run")
async def run_pipeline(
    pipeline_id: str,
    body: PipelineRunRequest,
    legacy: PipelineRegistry | None = Depends(get_pipelines),
    tool_registry: ToolRegistry | None = Depends(get_tool_registry),
    db: AsyncSession = Depends(get_db),
    event_bus: EventBus | None = Depends(get_event_bus),
) -> dict:
    """Run a pipeline. Prefers DB (orchestrated) path; falls back to legacy registry."""
    # Try DB lookup first (by id or name)
    pipeline_def = await db.get(PipelineDefinition, pipeline_id)
    if pipeline_def is None:
        result = await db.execute(
            select(PipelineDefinition).where(PipelineDefinition.name == pipeline_id)
        )
        pipeline_def = result.scalar_one_or_none()

    if pipeline_def is not None:
        if tool_registry is None:
            raise HTTPException(status_code=503, detail="Tool registry not initialized")
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise HTTPException(
                status_code=400,
                detail="ANTHROPIC_API_KEY is required to run orchestrated pipelines",
            )
        task_run = await run_orchestrated_pipeline(
            pipeline_def=pipeline_def,
            params=body.params,
            tool_registry=tool_registry,
            api_key=settings.anthropic_api_key,
            model=settings.anthropic_model,
            db=db,
            task_id=None,
            event_bus=event_bus,
        )
        return {
            "run_id": task_run.id,
            "status": task_run.status.value,
            "result": task_run.result,
            "error": task_run.error,
        }

    # Legacy fallback
    if legacy is None:
        raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")
    try:
        legacy.get(pipeline_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    task_run = await execute_pipeline_run(
        pipeline_name=pipeline_id,
        params=body.params,
        task_id=None,
        pipelines=legacy,
        db=db,
        event_bus=event_bus,
    )
    return {
        "run_id": task_run.id,
        "status": task_run.status.value,
        "result": task_run.result,
        "error": task_run.error,
    }
