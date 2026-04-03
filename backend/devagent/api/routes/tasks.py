from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["tasks"])


@router.get("/")
async def list_tasks() -> list:
    return []


@router.post("/")
async def create_task() -> dict:
    return {"status": "not_implemented"}


@router.get("/{task_id}")
async def get_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}


@router.put("/{task_id}")
async def update_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}


@router.delete("/{task_id}")
async def delete_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}


@router.post("/{task_id}/trigger")
async def trigger_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}
