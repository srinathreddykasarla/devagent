from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from devagent.api.deps import get_tool_registry
from devagent.orchestrator.tool_registry import ToolRegistry

router = APIRouter(tags=["tools"])


@router.get("/")
async def list_tools(
    tool_registry: ToolRegistry | None = Depends(get_tool_registry),
) -> list[dict]:
    """Return all tools currently exposed to the orchestrator."""
    if tool_registry is None:
        raise HTTPException(status_code=503, detail="Tool registry not initialized")
    return tool_registry.list_tools()
