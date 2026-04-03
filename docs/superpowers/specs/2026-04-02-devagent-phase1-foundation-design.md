# DevAgent Phase 1: Foundation — Design Spec

## Context

DevAgent is an open-source, local-first AI developer platform that automates software engineering tasks by integrating with Jira, GitHub, MS Teams, and Outlook. The flagship feature is an agentic pipeline that reads a Jira ticket, plans code changes, makes edits using Claude Code CLI in headless mode, and creates a pull request.

This spec covers **Phase 1: Foundation** — the project scaffold, configuration system, database, API skeleton, worker infrastructure, frontend scaffold, and Docker orchestration. No business logic is implemented here; Phase 2 tracks (plugins, pipelines, scheduler, frontend pages) build on this foundation.

## Decisions Made

- **Package manager:** uv (fast, modern, native pyproject.toml support)
- **Celery + Redis:** Included in Phase 1 (factory + config, no task logic)
- **Git operations:** asyncio.subprocess only (no GitPython dependency)
- **Frontend scaffold:** Vite + React 18 + TypeScript + shadcn/ui + TanStack Query
- **API stubs:** All route files created with correct signatures, returning placeholder responses
- **Decomposition:** Phase-by-phase — this spec is Foundation only

## What Phase 1 Delivers

A fully runnable project skeleton where:
- `make dev` starts the backend (uvicorn) + frontend (vite dev) locally
- `make docker-up` starts all services via Docker Compose
- All `.env` configuration is validated at startup via Pydantic Settings
- Database tables are created via Alembic migration
- API endpoints return stub responses at correct paths
- Frontend shows layout shell with routing to empty pages
- Celery worker connects to Redis but has no tasks yet

## What Phase 1 Does NOT Deliver

- Plugin implementations (Jira, GitHub, Teams, Outlook)
- LangGraph pipeline logic
- Claude Code CLI wrapper
- Celery task definitions (just the app factory)
- Frontend pages with real data
- Comprehensive tests (only a basic config smoke test)

---

## 1. Project Structure

All directories and `__init__.py` files created per the master spec. Key files for Phase 1:

```
devagent/
├── .env.example
├── .gitignore
├── CLAUDE.md
├── README.md
├── Makefile
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.worker
├── Dockerfile.ui
├── backend/
│   ├── pyproject.toml              # uv, Python 3.12+
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial.py      # TaskDefinition + TaskRun tables
│   └── devagent/
│       ├── __init__.py
│       ├── app.py                  # FastAPI factory + lifespan
│       ├── config.py               # All Pydantic Settings classes
│       ├── database.py             # Async SQLAlchemy engine + session
│       ├── api/
│       │   ├── __init__.py
│       │   ├── deps.py             # Dependency injection stubs
│       │   └── routes/
│       │       ├── __init__.py
│       │       ├── tasks.py        # Stub CRUD routes
│       │       ├── runs.py         # Stub routes
│       │       ├── plugins.py      # Stub routes
│       │       ├── pipelines.py    # Stub routes
│       │       └── ws.py           # WebSocket stub
│       ├── core/
│       │   ├── __init__.py
│       │   ├── scheduler.py        # Empty placeholder
│       │   ├── runner.py           # Empty placeholder
│       │   ├── event_bus.py        # Empty placeholder
│       │   └── security.py         # Fernet encryption utility
│       ├── plugins/
│       │   ├── __init__.py
│       │   ├── base.py             # Empty placeholder
│       │   ├── jira/__init__.py
│       │   ├── github/__init__.py
│       │   ├── teams/__init__.py
│       │   └── outlook/__init__.py
│       ├── pipelines/
│       │   ├── __init__.py
│       │   ├── base.py             # Empty placeholder
│       │   └── registry.py         # Empty placeholder
│       ├── agents/
│       │   ├── __init__.py
│       │   └── claude_code.py      # Empty placeholder
│       ├── models/
│       │   ├── __init__.py
│       │   ├── task.py             # TaskDefinition model
│       │   ├── run.py              # TaskRun model
│       │   └── plugin_config.py    # PluginConfig model
│       └── workers/
│           ├── __init__.py
│           ├── celery_app.py       # Celery factory
│           └── tasks.py            # Empty task stubs
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # React Router setup
│       ├── pages/                  # Empty page shells
│       ├── components/layout/      # Sidebar + Header + Layout
│       ├── hooks/                  # useWebSocket, useApi stubs
│       ├── lib/                    # api.ts, types.ts
│       └── styles/globals.css
└── tests/
    └── backend/
        └── test_config.py          # Config smoke test
```

## 2. Configuration System

`backend/devagent/config.py` — the single source of truth for all settings.

**Classes:**
- `AppSettings` — core app, database, Redis, Celery, Claude Code, Anthropic, workspace, OTEL
- `JiraSettings` (env_prefix=`JIRA_`)
- `GitHubSettings` (env_prefix=`GITHUB_`)
- `GitLabSettings` (env_prefix=`GITLAB_`)
- `TeamsSettings` (env_prefix=`TEAMS_`)
- `OutlookSettings` (env_prefix=`OUTLOOK_`)

**Rules:**
- All settings read from `.env` via `pydantic-settings`
- `app_secret_key` has `min_length=32` validation
- Comma-separated env vars (CORS origins, allowed tools) parsed via `field_validator`
- Singleton accessor `get_settings()` for `AppSettings`
- Integration settings instantiated on demand (by plugin registry in Phase 2)

**`.env.example`** contains all variables with documented defaults per the master spec.

## 3. Database Layer

`backend/devagent/database.py`:
- `create_async_engine()` from `DATABASE_URL` setting
- `async_sessionmaker` for session factory
- `get_db()` async generator for FastAPI dependency injection
- `init_db()` called during FastAPI lifespan

**Models (SQLAlchemy 2.0 declarative):**

`models/task.py` — `TaskDefinition`:
- id (String PK), name, pipeline, trigger_type (enum: cron/webhook/manual/event)
- trigger_config (JSON), params (JSON), enabled (bool)
- notify_on (JSON), created_at, updated_at

`models/run.py` — `TaskRun`:
- id (String PK), task_id (indexed FK), status (enum: pending/running/success/failed/cancelled)
- started_at, finished_at, logs (JSON), result (JSON), error, retry_count

`models/plugin_config.py` — `PluginConfig`:
- id (String PK), plugin_name, config_data (JSON, encrypted at rest)
- created_at, updated_at

**Alembic:** Initial migration creates all three tables. Configured for both SQLite and PostgreSQL.

## 4. FastAPI Application

`backend/devagent/app.py`:
- `create_app()` factory function
- Lifespan: init database, store settings on `app.state`
- CORS middleware from `app_cors_origins` setting
- Routers mounted at: `/api/tasks`, `/api/runs`, `/api/plugins`, `/api/pipelines`, `/ws`
- Health check endpoint at `/api/health`

**API Route Stubs** — all files created with correct router, tags, and endpoint signatures. Each returns `{"status": "not_implemented"}` or empty lists. Correct HTTP methods and path params are in place so the frontend can wire up immediately.

Key stub endpoints:
- `GET/POST /api/tasks` — list/create tasks
- `GET/PUT/DELETE /api/tasks/{task_id}` — CRUD
- `POST /api/tasks/{task_id}/trigger` — manual trigger
- `GET /api/runs` — list runs
- `GET /api/runs/{run_id}` — run detail
- `GET /api/plugins` — list plugins with health
- `POST /api/pipelines/{pipeline_id}/run` — trigger pipeline
- `WS /ws/logs/{run_id}` — log streaming

**Dependency injection** (`api/deps.py`):
- `get_settings()` — returns AppSettings
- `get_db()` — yields async session
- Stubs for `get_plugins()`, `get_scheduler()` (Phase 2)

## 5. Celery Worker Infrastructure

`backend/devagent/workers/celery_app.py`:
- Celery app factory reading `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` from settings
- Task autodiscovery from `devagent.workers.tasks`
- Beat schedule configuration (empty, populated in Phase 2)

`backend/devagent/workers/tasks.py`:
- Empty file with a single `@celery_app.task` placeholder (health_check ping)

## 6. Docker Compose

Services per the master spec:
- `api` — FastAPI with uvicorn, mounts workspace and Claude auth
- `worker` — Celery worker, same image as api
- `scheduler` — Celery Beat
- `ui` — Vite dev server (development) or nginx (production)
- `redis` — Redis 7 Alpine
- `db` — PostgreSQL 16 Alpine

Dockerfiles:
- `Dockerfile.api` — Python 3.12, uv install, copies backend/
- `Dockerfile.worker` — Same base as api (can share image)
- `Dockerfile.ui` — Node 20, npm install, Vite build

## 7. Frontend Scaffold

Initialized with Vite + React 18 + TypeScript.

**Dependencies:** react, react-dom, react-router-dom, @tanstack/react-query, tailwindcss, shadcn/ui components (button, card, badge, input, select, dialog, sheet, table)

**Layout:**
- `Layout.tsx` — sidebar + header + main content area
- `Sidebar.tsx` — navigation links (Dashboard, Tasks, Pipelines, Plugins, Runs)
- `Header.tsx` — app name + breadcrumb

**Pages (shells only):**
- `Dashboard.tsx` — placeholder "Dashboard" heading
- `Tasks.tsx` — placeholder list
- `TaskDetail.tsx` — placeholder
- `Pipelines.tsx` — placeholder
- `Plugins.tsx` — placeholder
- `Runs.tsx` — placeholder
- `RunDetail.tsx` — placeholder

**Hooks (stubs):**
- `useWebSocket.ts` — connects to WS endpoint, returns messages array
- `useApi.ts` — TanStack Query wrapper with base URL

**Lib:**
- `api.ts` — fetch wrapper with `VITE_API_URL` base
- `types.ts` — TypeScript interfaces matching backend models (Task, Run, Plugin, etc.)

## 8. Dev Tooling

**Makefile targets:**
- `make dev` — starts uvicorn + vite dev server
- `make docker-up` — docker compose up -d
- `make docker-down` — docker compose down
- `make test` — pytest
- `make lint` — ruff check + ruff format --check
- `make migrate` — alembic upgrade head
- `make new-migration` — alembic revision --autogenerate

**.gitignore:** Python (__pycache__, .venv, *.pyc, .egg-info), Node (node_modules, dist), env files (.env but not .env.example), IDE (.vscode, .idea), OS (.DS_Store), database (*.db), workspace (repos/)

**CLAUDE.md:** Project overview, architecture summary, key commands, code conventions, project structure pointers — per master spec.

**README.md:** Project description, prerequisites (Python 3.12+, Node 20+, Redis, uv), quickstart (cp .env.example .env, make dev), Docker quickstart (make docker-up).

## 9. Verification

After Phase 1 is implemented, verify:

1. `cd backend && uv sync` installs all Python dependencies
2. `cd frontend && npm install` installs all Node dependencies
3. Copy `.env.example` to `.env`, set a valid `APP_SECRET_KEY`
4. `make migrate` creates database tables (SQLite)
5. `make dev` starts both backend (port 8000) and frontend (port 5173)
6. `curl http://localhost:8000/api/health` returns `{"status": "ok"}`
7. `curl http://localhost:8000/api/tasks` returns `[]`
8. Frontend at `http://localhost:5173` shows layout with sidebar navigation
9. `make lint` passes with no errors
10. `make test` runs config smoke test successfully
