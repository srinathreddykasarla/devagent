# DevAgent Architecture

## Overview

DevAgent is a local-first AI developer platform that automates software engineering tasks. It reads Jira tickets, plans code changes using Claude Code CLI, and creates pull requests on GitHub.

## System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   FastAPI    │────▶│   Celery     │
│  React/Vite  │◀────│   Backend    │◀────│   Workers    │
└─────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                    ┌──────┴───────┐      ┌──────┴───────┐
                    │  PostgreSQL  │      │    Redis     │
                    │  (SQLite dev)│      │   (Broker)   │
                    └──────────────┘      └──────────────┘
                           │
                    ┌──────┴───────┐
                    │   Plugins    │
                    │ Jira│GitHub  │
                    │Teams│Outlook │
                    └──────────────┘
```

## Backend Architecture

### Request Flow

1. HTTP request hits FastAPI
2. Route handler receives request with dependency injection (db session, settings, plugin registry)
3. For immediate operations: handler queries database and returns response
4. For pipeline execution: handler creates a TaskRun, dispatches to Celery worker
5. Celery worker executes the pipeline (e.g., Jira-to-PR)
6. Pipeline progress streams via EventBus → WebSocket to frontend

### Plugin System

All external integrations implement the `BasePlugin` ABC:

```python
class BasePlugin(ABC):
    name: str
    description: str
    capabilities: list[PluginCapability]

    async def initialize(self) -> None: ...
    async def health_check(self) -> PluginHealth: ...
    async def execute(self, action: str, params: dict) -> dict: ...
    def shutdown(self) -> None: ...
```

Plugins are auto-registered at startup based on `.env` settings. The `PluginRegistry` manages lifecycle.

**Available plugins:**
- **Jira** — Read tickets, comments, attachments; post comments
- **GitHub** — Clone repos, create branches, commit, push, open PRs
- **Teams** — Send notifications via webhook
- **Outlook** — Send emails via MS Graph API

### Pipeline System

Pipelines are LangGraph state machines. The flagship `jira_to_pr` pipeline:

```
read_jira → [sufficient?] → setup_repo → run_claude_code → create_pr
                ↓ no
          request_context → END
```

Each node is an async function that reads/writes to a shared `TypedDict` state.

### Configuration

**All** settings come from `.env` via Pydantic Settings. No `os.environ` reads anywhere.

- `AppSettings` — Core app, database, Redis, Celery, Claude Code, Anthropic
- `JiraSettings` — Jira connection (env_prefix=`JIRA_`)
- `GitHubSettings` — GitHub token and defaults (env_prefix=`GITHUB_`)
- `TeamsSettings` — Teams webhook (env_prefix=`TEAMS_`)
- `OutlookSettings` — MS Graph credentials (env_prefix=`OUTLOOK_`)

### Database

- **SQLAlchemy 2.0 async** with `aiosqlite` (dev) or `asyncpg` (prod)
- Models: `TaskDefinition`, `TaskRun`, `PluginConfig`
- Migrations via **Alembic** with async engine support
- Single `DATABASE_URL` env var switches between SQLite and PostgreSQL

## Frontend Architecture

- **React 18** with TypeScript
- **Vite** for bundling with API proxy to backend
- **TanStack Query** for server state (queries + mutations)
- **React Router v6** for client-side routing
- **Tailwind CSS** for styling with shadcn/ui CSS variables
- **WebSocket** for live log streaming from pipeline runs

### Pages
- Dashboard — health status, plugin cards, recent runs
- Tasks — CRUD table with create/edit/delete
- Pipelines — list with run dialog
- Plugins — health cards with capabilities
- Runs — history table with status badges
- RunDetail — live log viewer via WebSocket

## Deployment

### Docker Compose (Production)
- `api` — FastAPI with uvicorn
- `worker` — Celery worker
- `scheduler` — Celery Beat
- `ui` — Nginx serving built frontend
- `redis` — Message broker
- `db` — PostgreSQL

### Local Development
- `make dev` — uvicorn (hot reload) + Vite dev server
- SQLite database, no Docker required
- Redis needed only for Celery (optional for basic dev)
