# DevAgent

Local-first AI developer platform with Jira/GitHub/Teams/Outlook integrations. Pipelines are prompt-driven — users write system prompts in the GUI and the orchestrator uses Anthropic tool_use to call plugin actions and Claude Code autonomously.

## Architecture
- Backend: Python 3.12+, FastAPI, Celery, SQLAlchemy 2.0 (async), Anthropic SDK (tool_use)
- Frontend: React 19, TypeScript, Vite 8, Tailwind v4, TanStack Query, lucide-react
- Data: SQLite (dev) / PostgreSQL 16 (prod), Redis 7
- Orchestration: Anthropic tool_use agent loop
- All config from .env via Pydantic Settings — never hardcode secrets

## Key Commands
- `make dev` — start backend + frontend in dev mode (runs from backend/ dir)
- `make docker-up` — start full stack via Docker Compose (6 services: api, worker, scheduler, ui, redis, db)
- `make test` — run all tests
- `make lint` — run ruff + mypy
- `docker compose build api ui && docker compose up -d` — rebuild and restart after code changes

## Code Conventions
- Async everywhere in backend (async def, httpx, asyncpg)
- Type hints on all functions
- Pydantic models for all request/response schemas
- Plugin pattern: all integrations implement BasePlugin ABC with TOOL_SCHEMAS for orchestrator discovery
- No os.environ reads — always use config.py settings classes
- config.py resolves .env from project root via _PROJECT_ROOT, not CWD
- Frontend: all UI components in components/ui/ — never inline raw Tailwind for cards/buttons/modals
- Frontend: all colors via CSS variables (--bg, --surface, --accent, etc.) — never hardcode colors
- Frontend: JetBrains Mono is the sole font (Mission Control aesthetic)

## Project Structure

### Backend
- `backend/devagent/config.py` — ALL configuration, resolves .env from project root
- `backend/devagent/app.py` — FastAPI app factory, lifespan (plugins, tool registry, pipeline seeding)
- `backend/devagent/orchestrator/` — prompt-driven pipeline execution
  - `tool_registry.py` — derives Anthropic tools from plugin TOOL_SCHEMAS + Claude Code agent
  - `orchestrator.py` — agentic tool_use loop (system_prompt + tools → LLM decides what to call)
- `backend/devagent/plugins/` — integration plugins (jira, github, teams, outlook)
  - `base.py` — BasePlugin ABC with TOOL_SCHEMAS class attribute
  - Each plugin: `plugin.py` (TOOL_SCHEMAS + execute dispatch), `client.py` (async HTTP client)
  - Jira client: `adf_to_text()` converts Atlassian Document Format to plain text
- `backend/devagent/agents/claude_code.py` — Claude Code CLI subprocess wrapper
- `backend/devagent/core/runner.py` — run_orchestrated_pipeline() (merges params, runs orchestrator, persists result)
- `backend/devagent/core/event_bus.py` — in-memory pub/sub for real-time log streaming
- `backend/devagent/database.py` — async engine init, auto-migration for schema changes
- `backend/devagent/models/` — SQLAlchemy models
  - `pipeline.py` — PipelineDefinition (name, system_prompt, default_params, param_schema, is_builtin)
  - `run.py` — TaskRun (status, logs, result, error)
  - `task.py` — TaskDefinition (trigger_type, params, enabled)
- `backend/devagent/api/routes/` — FastAPI endpoints
  - `pipelines.py` — CRUD + run (validates required params from param_schema, dispatches to orchestrator)
  - `tools.py` — GET /api/tools/ (lists all available tools for the orchestrator)
  - `runs.py`, `tasks.py`, `plugins.py`, `ws.py`

### Frontend
- `frontend/src/styles/globals.css` — Mission Control theme (dark navy + amber, cream light mode)
- `frontend/src/components/ui/` — reusable primitives (Button, Card, Panel, Badge, StatusDot, Modal, Table, LogStream, CopyButton, EmptyState, Input/Textarea/Select/Label)
- `frontend/src/components/layout/` — Layout (CSS grid), Sidebar (lucide icons, amber active rail, plugin status), Header (breadcrumbs, live indicator, theme toggle)
- `frontend/src/pages/` — Dashboard, Pipelines, Tasks, TaskDetail, Plugins, Runs, RunDetail
- `frontend/src/hooks/useApi.ts` — TanStack Query hooks for all CRUD + mutations
- `frontend/src/hooks/useTheme.ts` — dark/light toggle with localStorage persistence
- `frontend/src/hooks/useWebSocket.ts` — live log streaming for RunDetail
- `frontend/src/lib/api.ts` — fetch wrapper for all API endpoints
- `frontend/src/lib/types.ts` — TypeScript types (Pipeline, ParamFieldDef, Run, Task, Tool, etc.)
- `frontend/src/lib/format.ts` — formatDuration, formatRelativeTime, shortId, extractToolRefs

## API Endpoints
- `GET /api/health` — health check
- `GET /api/plugins/` — plugin health + capabilities
- `GET /api/tools/` — available orchestrator tools (derived from plugins)
- `GET/POST /api/pipelines/` — list / create pipeline
- `GET/PUT/DELETE /api/pipelines/{id}` — read / update / delete pipeline
- `POST /api/pipelines/{id}/run` — execute pipeline (validates required params, runs orchestrator)
- `GET/POST /api/tasks/` — list / create task definitions
- `GET/PUT/DELETE /api/tasks/{id}` — read / update / delete task
- `POST /api/tasks/{id}/trigger` — trigger a task
- `GET /api/runs/` — list all runs
- `GET /api/runs/{id}` — run detail with logs and result
- `WS /ws/logs/{runId}` — live log streaming

## Pipeline System
Pipelines are stored in the DB as PipelineDefinition rows with a system_prompt and optional param_schema. When run:
1. Required parameters are validated against param_schema (if defined)
2. The orchestrator loads the prompt and available tools (from ToolRegistry)
3. Merges default_params with runtime params
4. Calls Anthropic API with tool_use, letting the LLM decide which tools to invoke
5. Tools are named `{plugin}__{action}` (e.g. jira__read_ticket, github__clone_repo, claude_code__execute)
6. Each tool call is dispatched to the corresponding plugin's execute() method
7. Results are persisted as TaskRun records with status, logs, and result

Built-in pipelines seeded on startup:
- `jira_to_pr_agent` — params: jira_id (required), repo_url (optional)
- `jira_summary_agent` — params: project_key (required), status_filter (optional)

## Docker Services
- `api` — FastAPI backend (Dockerfile.api, port 8000)
- `worker` — Celery worker (Dockerfile.worker)
- `scheduler` — Celery beat (Dockerfile.worker)
- `ui` — React frontend via nginx (Dockerfile.ui, port 3000)
- `redis` — Redis 7 (port 6379)
- `db` — PostgreSQL 16 (port 5432)
