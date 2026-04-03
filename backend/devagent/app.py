from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from devagent.config import get_settings
from devagent.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.app_log_level)

    await init_db(settings.database_url)
    app.state.settings = settings

    logger.info("DevAgent started | env=%s", settings.app_env)
    yield
    logger.info("DevAgent shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.app_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from devagent.api.routes import pipelines, plugins, runs, tasks, ws

    app.include_router(tasks.router, prefix="/api/tasks")
    app.include_router(runs.router, prefix="/api/runs")
    app.include_router(plugins.router, prefix="/api/plugins")
    app.include_router(pipelines.router, prefix="/api/pipelines")
    app.include_router(ws.router, prefix="/ws")

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app
