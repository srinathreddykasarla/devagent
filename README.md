# DevAgent

Open-source, local-first AI developer platform that automates software engineering tasks.

DevAgent integrates with Jira, GitHub, MS Teams, and Outlook to read tickets, plan code changes, and create pull requests — powered by Claude Code CLI in headless mode.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Node.js 20+
- Redis 7+ (for Celery broker)
- Docker & Docker Compose (optional, for full stack)

## Quickstart (Local)

```bash
# Clone and enter project
cd devagent

# Configure environment
cp .env.example .env
# Edit .env — at minimum set APP_SECRET_KEY (32+ chars)

# Backend
cd backend
uv sync
cd ..

# Frontend
cd frontend
npm install
cd ..

# Run database migrations
make migrate

# Start dev servers (backend + frontend)
make dev
```

Backend runs at http://localhost:8000, frontend at http://localhost:5173.

## Quickstart (Docker)

```bash
cp .env.example .env
# Edit .env with your settings
make docker-up
```

All services start: API (8000), UI (3000), Redis, PostgreSQL.

## Development

```bash
make dev          # Start backend + frontend dev servers
make test         # Run all tests
make lint         # Run ruff linter + formatter check
make migrate      # Run database migrations
make new-migration msg="description"  # Create new Alembic migration
make docker-up    # Start full stack via Docker Compose
make docker-down  # Stop Docker services
```

## Architecture

- **Backend:** FastAPI + Celery + SQLAlchemy (async) + LangGraph
- **Frontend:** React + Vite + shadcn/ui + TanStack Query
- **Config:** All settings from `.env` via Pydantic Settings
- **Plugins:** Jira, GitHub, Teams, Outlook — each implements BasePlugin ABC
- **Pipelines:** LangGraph state machines (e.g., Jira ticket → PR)
