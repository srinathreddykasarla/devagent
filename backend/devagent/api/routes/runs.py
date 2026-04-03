from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["runs"])


@router.get("/")
async def list_runs() -> list:
    return []


@router.get("/{run_id}")
async def get_run(run_id: str) -> dict:
    return {"status": "not_implemented", "run_id": run_id}
