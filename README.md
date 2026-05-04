# DevAgent

Open-source, local-first AI developer platform that automates software engineering tasks.

DevAgent integrates with Jira, GitHub, MS Teams, and Outlook to read tickets, implement code changes, and create pull requests — orchestrated by an LLM agent loop that decides which tools to call based on a user-written prompt.

## How It Works

Pipelines are **prompt-driven**. Instead of writing code, you write a system prompt describing what the agent should do. The orchestrator uses Anthropic's tool_use API to let the LLM call plugin actions (Jira, GitHub) and Claude Code autonomously.

```
User writes prompt in GUI  -->  Saved to DB
         |
User clicks "Run"  -->  Orchestrator: Anthropic tool_use loop
         |                    |-- jira__read_ticket
         |                    |-- jira__search_tickets
         |                    |-- github__clone_repo
         |                    |-- github__create_pr
         |                    |-- claude_code__execute
         |                    |-- ...
         v
Result persisted + streamed via WebSocket
```

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 20+
- Redis 7+ (for Celery broker)
- Docker & Docker Compose (optional, for full stack)
- Anthropic API key (for orchestrated pipelines)

## Quickstart (Docker)

```bash
cp .env.example .env
# Edit .env — set APP_SECRET_KEY, ANTHROPIC_API_KEY, and enable plugins (JIRA_ENABLED, GITHUB_ENABLED)
docker compose up -d
```

All services start: API (8000), UI (3000), Worker, Scheduler, Redis, PostgreSQL.

Open http://localhost:3000 to access the dashboard.

## Quickstart (Local Dev)

```bash
# Configure environment
cp .env.example .env
# Edit .env — set APP_SECRET_KEY, switch to SQLite (uncomment the sqlite line, comment postgres)

# Install dependencies
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..

# Start dev servers (backend + frontend)
make dev
```

Backend runs at http://localhost:8000, frontend at http://localhost:5173.

## Development Commands

```bash
make dev              # Start backend + frontend dev servers
make test             # Run all tests
make lint             # Run ruff linter + formatter check
make docker-up        # Start full stack via Docker Compose
make docker-down      # Stop Docker services
make clean            # Remove __pycache__ and dev databases
```

## Architecture

```
backend/devagent/
  orchestrator/         # Prompt-driven pipeline execution
    tool_registry.py    # Derives LLM tools from plugin TOOL_SCHEMAS
    orchestrator.py     # Agentic tool_use loop (Anthropic SDK)
  plugins/              # Integration plugins (Jira, GitHub, Teams, Outlook)
    base.py             # BasePlugin ABC with TOOL_SCHEMAS
    registry.py         # PluginRegistry for auto-discovery
    jira/               # Jira client + plugin (read_ticket, search, post_comment)
    github/             # GitHub client + plugin (clone, branch, PR)
    teams/              # MS Teams client + plugin
    outlook/            # Outlook client + plugin
  agents/               # Claude Code CLI wrapper (headless subprocess)
  core/                 # Runner (pipeline execution + persistence), event bus (WebSocket streaming)
  models/               # SQLAlchemy models (PipelineDefinition, TaskRun, TaskDefinition)
  api/routes/           # FastAPI endpoints (pipelines, runs, tasks, plugins, tools, ws)
  workers/              # Celery worker + beat scheduler

frontend/src/
  components/ui/        # Reusable component library (14 primitives)
  components/layout/    # Shell (Sidebar, Header, Layout)
  pages/                # Dashboard, Pipelines, Tasks, TaskDetail, Plugins, Runs, RunDetail
  hooks/                # TanStack Query hooks, WebSocket, theme toggle
  lib/                  # API client, TypeScript types, formatters, utilities
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Celery, Anthropic SDK |
| Frontend | React 19, TypeScript, Vite 8, Tailwind v4, TanStack Query, lucide-react |
| Database | SQLite (dev) / PostgreSQL 16 (prod) |
| Queue | Redis 7 + Celery |
| Orchestration | Anthropic tool_use agent loop |
| Agent | Claude Code CLI (headless mode) |

### Plugin System

Each integration (Jira, GitHub, Teams, Outlook) implements `BasePlugin` with a `TOOL_SCHEMAS` dict that declares tool definitions for the orchestrator. The `ToolRegistry` auto-discovers these at startup and exposes them to the LLM.

Available tools are listed at `GET /api/tools/` and shown in the pipeline editor UI.

### Pipeline System

Pipelines are stored in the database as `PipelineDefinition` rows:

| Field | Description |
|-------|-------------|
| `name` | Unique identifier (e.g. `jira_to_pr_agent`) |
| `description` | Human-readable summary |
| `system_prompt` | The prompt that drives the agent's behavior |
| `default_params` | Default parameters (merged with runtime params) |
| `param_schema` | Typed parameter definitions for the UI (key, label, type, required, placeholder) |
| `is_builtin` | Protected from deletion (seeded on startup) |

When a pipeline is run, the orchestrator:
1. Loads the system prompt and available tools
2. Validates required parameters against the `param_schema`
3. Calls Anthropic API with tool_use
4. Dispatches each tool call to the corresponding plugin
5. Persists the result as a `TaskRun` with status, logs, and output

Built-in pipelines seeded on startup:
- **jira_to_pr_agent** — reads a Jira ticket, clones the repo, implements changes via Claude Code, opens a PR
- **jira_summary_agent** — fetches tickets from a Jira project and produces an executive backlog summary

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/plugins/` | Plugin health + capabilities |
| `GET` | `/api/tools/` | Available orchestrator tools |
| `GET/POST` | `/api/pipelines/` | List / create pipelines |
| `GET/PUT/DELETE` | `/api/pipelines/{id}` | Read / update / delete pipeline |
| `POST` | `/api/pipelines/{id}/run` | Execute a pipeline |
| `GET/POST` | `/api/tasks/` | List / create task definitions |
| `GET/PUT/DELETE` | `/api/tasks/{id}` | Read / update / delete task |
| `POST` | `/api/tasks/{id}/trigger` | Trigger a task |
| `GET` | `/api/runs/` | List all runs |
| `GET` | `/api/runs/{id}` | Run detail with logs |
| `WS` | `/ws/logs/{runId}` | Live log streaming |

## Docker Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `api` | Dockerfile.api | 8000 | FastAPI backend |
| `worker` | Dockerfile.worker | — | Celery worker |
| `scheduler` | Dockerfile.worker | — | Celery beat scheduler |
| `ui` | Dockerfile.ui | 3000 | React frontend via nginx |
| `redis` | redis:7-alpine | 6379 | Message broker + cache |
| `db` | postgres:16-alpine | 5432 | PostgreSQL database |

## Frontend

The UI follows a **Mission Control** aesthetic — JetBrains Mono, deep navy + amber dark theme, dense telemetry-style layouts with live status indicators.

Key features:
- **Dashboard** — system health, plugin status, recent runs, quick-dispatch buttons
- **Pipelines** — create/edit prompt-driven agents with a schema builder for typed parameter inputs, available tools reference panel, and auto-detected tool badges
- **Runs** — filterable execution history with status pills, auto-refresh
- **Run Detail** — split-view with metadata and live streaming log viewer (WebSocket)
- **Tasks** — schedule pipelines via cron, webhook, or manual trigger
- **Plugins** — integration health console
- **Theme toggle** — dark (navy) / light (cream) with localStorage persistence

## License

MIT
