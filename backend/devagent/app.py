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
from devagent.database import get_db, init_db
from devagent.orchestrator.tool_registry import build_tool_registry
from devagent.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)


BUILTIN_PIPELINES = [
    {
        "name": "jira_to_pr_agent",
        "description": (
            "Prompt-based version: reads a Jira ticket, assesses context, clones the repo, "
            "runs Claude Code to implement changes, opens a PR, and comments on the ticket."
        ),
        "system_prompt": (
            "You are a DevAgent pipeline that implements Jira tickets as pull requests.\n\n"
            "Given a ticket_id (and optionally a repo_url), follow these steps:\n"
            "1. Use jira__read_ticket to fetch the ticket details.\n"
            "2. If the description is too vague or missing requirements, use jira__post_comment "
            "to ask for more context and stop.\n"
            "3. If no repo_url was provided, look for a GitHub URL in the description. "
            "If none found, use jira__post_comment to ask for it and stop.\n"
            "4. Use github__clone_repo to clone the repository.\n"
            "5. Use github__create_branch with branch name like 'fix/{ticket_id}-{summary-slug}'.\n"
            "6. Use claude_code__execute to implement the changes based on the ticket.\n"
            "7. Use github__create_pr to open a pull request.\n"
            "8. Use jira__post_comment to post the PR URL back to the ticket.\n\n"
            "Always reference the ticket ID in branch names and PR titles. "
            "Be concise in your intermediate reasoning."
        ),
        "default_params": {},
    },
    {
        "name": "jira_summary_agent",
        "description": (
            "Prompt-based version: fetches tickets from a Jira project and produces an "
            "executive backlog summary."
        ),
        "system_prompt": (
            "You are a DevAgent pipeline that summarizes Jira project backlogs.\n\n"
            "Given a project key (and optionally a status filter):\n"
            "1. Use jira__search_tickets to fetch tickets for the project.\n"
            "2. Analyze the tickets and produce a concise summary covering:\n"
            "   - Overview of what the project/backlog is about\n"
            "   - Priority breakdown\n"
            "   - Status distribution\n"
            "   - Key themes grouping related tickets\n"
            "   - Risks and blockers\n"
            "   - Recommendations for what to tackle next\n\n"
            "Reference specific ticket IDs. Keep the summary under 500 words."
        ),
        "default_params": {},
    },
]


async def _seed_builtin_pipelines() -> None:
    """Insert built-in prompt-based pipelines if they don't exist."""
    from uuid import uuid4

    from sqlalchemy import select

    from devagent.models import PipelineDefinition

    async for session in get_db():
        for p in BUILTIN_PIPELINES:
            existing = (
                await session.execute(
                    select(PipelineDefinition).where(PipelineDefinition.name == p["name"])
                )
            ).scalar_one_or_none()
            if existing is None:
                session.add(
                    PipelineDefinition(
                        id=uuid4().hex,
                        name=p["name"],
                        description=p["description"],
                        system_prompt=p["system_prompt"],
                        default_params=p["default_params"],
                        is_builtin=True,
                    )
                )
                logger.info("Seeded built-in pipeline '%s'", p["name"])
        await session.commit()
        break


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

    # Build the tool registry from plugins (for orchestrated pipelines)
    app.state.tool_registry = build_tool_registry(registry)
    logger.info(
        "Tool registry built with %d tools",
        len(app.state.tool_registry.get_tool_definitions()),
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

    # Seed built-in prompt-based pipelines into the DB
    await _seed_builtin_pipelines()

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

    from devagent.api.routes import pipelines, plugins, runs, tasks, tools, ws

    app.include_router(tasks.router, prefix="/api/tasks")
    app.include_router(runs.router, prefix="/api/runs")
    app.include_router(plugins.router, prefix="/api/plugins")
    app.include_router(pipelines.router, prefix="/api/pipelines")
    app.include_router(tools.router, prefix="/api/tools")
    app.include_router(ws.router, prefix="/ws")

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app
