from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from devagent.config import (
    GitHubSettings,
    JiraSettings,
    OutlookSettings,
    TeamsSettings,
    get_settings,
)
from devagent.database import init_db
from devagent.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)


async def _init_plugins() -> PluginRegistry:
    """Auto-register all enabled plugins based on .env settings."""
    registry = PluginRegistry()

    jira_settings = JiraSettings()
    logger.debug(
        "[Startup] Jira settings: enabled=%s, base_url=%s, email=%s",
        jira_settings.enabled,
        jira_settings.base_url,
        jira_settings.email,
    )
    if jira_settings.enabled:
        from devagent.plugins.jira.plugin import JiraPlugin

        await registry.register(JiraPlugin(jira_settings))
    else:
        logger.debug("[Startup] Jira plugin disabled, skipping")

    github_settings = GitHubSettings()
    logger.debug(
        "[Startup] GitHub settings: enabled=%s, org=%s, token_present=%s",
        github_settings.enabled,
        github_settings.default_org,
        bool(github_settings.token),
    )
    if github_settings.enabled:
        from devagent.plugins.github.plugin import GitHubPlugin

        await registry.register(GitHubPlugin(github_settings))
    else:
        logger.debug("[Startup] GitHub plugin disabled, skipping")

    teams_settings = TeamsSettings()
    if teams_settings.enabled:
        from devagent.plugins.teams.plugin import TeamsPlugin

        await registry.register(TeamsPlugin(teams_settings))

    outlook_settings = OutlookSettings()
    if outlook_settings.enabled:
        from devagent.plugins.outlook.plugin import OutlookPlugin

        await registry.register(OutlookPlugin(outlook_settings))

    logger.debug("[Startup] Plugin registration complete. Loaded: %s", list(registry._plugins.keys()))
    return registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(level=settings.app_log_level)

    await init_db(settings.database_url)
    app.state.settings = settings

    registry = await _init_plugins()
    app.state.plugins = registry
    enabled = registry.list_enabled()
    logger.info(
        "DevAgent started | env=%s | plugins=%s",
        settings.app_env,
        [p["name"] for p in enabled],
    )

    from devagent.pipelines.jira_to_pr import JiraToPRPipeline
    from devagent.pipelines.jira_summary import JiraSummaryPipeline
    from devagent.pipelines.registry import PipelineRegistry

    pipeline_registry = PipelineRegistry()
    # Only register Jira-to-PR if both jira and github plugins are available
    if "jira" in registry._plugins and "github" in registry._plugins:
        pipeline_registry.register(JiraToPRPipeline(registry))
    # Jira summary only needs the jira plugin
    if "jira" in registry._plugins:
        pipeline_registry.register(JiraSummaryPipeline(registry))
    app.state.pipelines = pipeline_registry

    from devagent.core.event_bus import EventBus

    event_bus = EventBus()
    app.state.event_bus = event_bus

    yield

    registry.shutdown_all()
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

    from devagent.api.errors import register_error_handlers

    register_error_handlers(app)

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
