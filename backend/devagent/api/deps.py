from __future__ import annotations

from fastapi import Request

from devagent.config import AppSettings, get_settings
from devagent.core.event_bus import EventBus
from devagent.database import get_db as _get_db
from devagent.pipelines.registry import PipelineRegistry
from devagent.plugins.registry import PluginRegistry


async def get_db():
    async for session in _get_db():
        yield session


def get_app_settings() -> AppSettings:
    return get_settings()


def get_plugins(request: Request) -> PluginRegistry | None:
    return getattr(request.app.state, "plugins", None)


def get_pipelines(request: Request) -> PipelineRegistry | None:
    return getattr(request.app.state, "pipelines", None)


def get_event_bus(request: Request) -> EventBus | None:
    return getattr(request.app.state, "event_bus", None)
