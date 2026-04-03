# DevAgent

Local-first AI developer platform with Jira/GitHub/Teams/Outlook integrations.

## Architecture
- Backend: Python 3.12+, FastAPI, Celery, LangGraph, SQLAlchemy 2.0 (async)
- Frontend: React 18, TypeScript, Vite, shadcn/ui, TanStack Query
- Data: SQLite (dev) / PostgreSQL (prod), Redis
- All config from .env via Pydantic Settings — never hardcode secrets

## Key Commands
- `make dev` — start backend + frontend in dev mode
- `make docker-up` — start full stack via Docker Compose
- `make test` — run all tests
- `make lint` — run ruff + mypy

## Code Conventions
- Async everywhere in backend (async def, httpx, asyncpg)
- Type hints on all functions
- Pydantic models for all request/response schemas
- Plugin pattern: all integrations implement BasePlugin ABC
- LangGraph for agent pipelines
- No os.environ reads — always use config.py settings classes

## Project Structure
- backend/devagent/config.py — ALL configuration, reads .env
- backend/devagent/plugins/ — integration plugins (jira, github, teams, outlook)
- backend/devagent/pipelines/ — LangGraph agent pipelines
- backend/devagent/agents/ — Claude Code CLI wrapper
- backend/devagent/api/routes/ — FastAPI endpoints
- frontend/src/pages/ — React pages
- frontend/src/hooks/ — custom hooks (useWebSocket, useApi)
