from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from devagent.api.deps import get_db
from devagent.models import TaskRun

router = APIRouter(tags=["runs"])


@router.get("/")
async def list_runs(
    task_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = select(TaskRun).order_by(TaskRun.started_at.desc())
    if task_id:
        query = query.where(TaskRun.task_id == task_id)
    result = await db.execute(query)
    runs = result.scalars().all()
    return [_run_to_dict(r) for r in runs]


@router.get("/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    run = await db.get(TaskRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return _run_to_dict(run)


def _run_to_dict(run: TaskRun) -> dict:
    return {
        "id": run.id,
        "task_id": run.task_id,
        "status": run.status.value if run.status else "pending",
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "logs": run.logs or [],
        "result": run.result,
        "error": run.error,
        "retry_count": run.retry_count or 0,
    }
