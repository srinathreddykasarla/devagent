from __future__ import annotations

from fastapi import APIRouter, Depends

from devagent.api.deps import get_plugins
from devagent.plugins.registry import PluginRegistry

router = APIRouter(tags=["plugins"])


@router.get("/")
async def list_plugins(plugins: PluginRegistry | None = Depends(get_plugins)) -> list:
    if plugins is None:
        return []
    return await plugins.health_check_all()
