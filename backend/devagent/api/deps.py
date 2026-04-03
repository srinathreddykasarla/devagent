from __future__ import annotations

from fastapi import Request

from devagent.config import AppSettings, get_settings
from devagent.database import get_db as _get_db
from devagent.plugins.registry import PluginRegistry


async def get_db():
    async for session in _get_db():
        yield session


def get_app_settings() -> AppSettings:
    return get_settings()


def get_plugins(request: Request) -> PluginRegistry | None:
    return getattr(request.app.state, "plugins", None)
