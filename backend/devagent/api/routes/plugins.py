from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["plugins"])


@router.get("/")
async def list_plugins() -> list:
    return []
