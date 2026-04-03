from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from devagent.api.deps import get_db
from devagent.api.schemas import TaskCreateRequest, TaskUpdateRequest
from devagent.models import TaskDefinition

router = APIRouter(tags=["tasks"])


@router.get("/")
async def list_tasks(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(TaskDefinition).order_by(TaskDefinition.created_at.desc()))
    tasks = result.scalars().all()
    return [_task_to_dict(t) for t in tasks]


@router.post("/", status_code=201)
async def create_task(
    body: TaskCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    task = TaskDefinition(
        id=uuid4().hex,
        name=body.name,
        pipeline=body.pipeline,
        trigger_type=body.trigger_type,
        trigger_config=body.trigger_config,
        params=body.params,
        enabled=body.enabled,
        notify_on=body.notify_on,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _task_to_dict(task)


@router.get("/{task_id}")
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    task = await db.get(TaskDefinition, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_dict(task)


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    body: TaskUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    task = await db.get(TaskDefinition, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return _task_to_dict(task)


@router.delete("/{task_id}")
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    task = await db.get(TaskDefinition, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"deleted": True, "task_id": task_id}


@router.post("/{task_id}/trigger")
async def trigger_task(task_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    task = await db.get(TaskDefinition, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Actual pipeline execution will be handled via Celery in production
    return {"status": "triggered", "task_id": task_id, "pipeline": task.pipeline}


def _task_to_dict(task: TaskDefinition) -> dict:
    return {
        "id": task.id,
        "name": task.name,
        "pipeline": task.pipeline,
        "trigger_type": task.trigger_type.value if task.trigger_type else "manual",
        "trigger_config": task.trigger_config or {},
        "params": task.params or {},
        "enabled": task.enabled,
        "notify_on": task.notify_on or [],
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }
