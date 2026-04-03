# DevAgent Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a fully runnable project skeleton with config, database, API stubs, Celery setup, Docker orchestration, and a frontend scaffold — producing a working `make dev` and `make docker-up` experience with no business logic.

**Architecture:** Python FastAPI backend with async SQLAlchemy (SQLite dev / Postgres prod), Celery+Redis worker infrastructure, React+Vite+shadcn/ui frontend. All configuration flows through `.env` → Pydantic Settings. Docker Compose orchestrates all services.

**Tech Stack:** Python 3.12+, uv, FastAPI, SQLAlchemy 2.0 (async), Alembic, Celery, Redis, Pydantic Settings, React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Docker Compose

---

## File Map

### Root-level files
| File | Purpose |
|------|---------|
| `.env.example` | All config vars with documented defaults |
| `.gitignore` | Python, Node, IDE, OS, database, workspace ignores |
| `CLAUDE.md` | Claude Code project instructions |
| `README.md` | Setup instructions and quickstart |
| `Makefile` | Dev shortcuts (dev, test, lint, docker-up, migrate) |
| `docker-compose.yml` | Full stack orchestration |
| `Dockerfile.api` | Python 3.12 + uv for API server |
| `Dockerfile.worker` | Same base as API for Celery worker |
| `Dockerfile.ui` | Node 20 for frontend |

### Backend files (`backend/`)
| File | Purpose |
|------|---------|
| `pyproject.toml` | uv project config + all Python dependencies |
| `alembic.ini` | Alembic database migration config |
| `alembic/env.py` | Alembic environment with async engine support |
| `alembic/versions/001_initial.py` | Initial migration: 3 tables |
| `devagent/__init__.py` | Package init |
| `devagent/config.py` | All Pydantic Settings classes (App, Jira, GitHub, GitLab, Teams, Outlook) |
| `devagent/database.py` | Async SQLAlchemy engine, session factory, init_db |
| `devagent/app.py` | FastAPI app factory with lifespan |
| `devagent/models/__init__.py` | Re-exports Base and all models |
| `devagent/models/task.py` | TaskDefinition + TriggerType enum |
| `devagent/models/run.py` | TaskRun + RunStatus enum |
| `devagent/models/plugin_config.py` | PluginConfig model |
| `devagent/api/__init__.py` | Package init |
| `devagent/api/deps.py` | FastAPI dependency injection |
| `devagent/api/routes/__init__.py` | Package init |
| `devagent/api/routes/tasks.py` | Task CRUD stub endpoints |
| `devagent/api/routes/runs.py` | Run list/detail stub endpoints |
| `devagent/api/routes/plugins.py` | Plugin list stub endpoint |
| `devagent/api/routes/pipelines.py` | Pipeline trigger stub endpoint |
| `devagent/api/routes/ws.py` | WebSocket log streaming stub |
| `devagent/core/__init__.py` | Package init |
| `devagent/core/security.py` | Fernet encryption utility |
| `devagent/workers/__init__.py` | Package init |
| `devagent/workers/celery_app.py` | Celery app factory |
| `devagent/workers/tasks.py` | Ping health check task |
| `devagent/plugins/__init__.py` | Package init |
| `devagent/pipelines/__init__.py` | Package init |
| `devagent/agents/__init__.py` | Package init |

### Frontend files (`frontend/`)
| File | Purpose |
|------|---------|
| `package.json` | Node project config + dependencies |
| `tsconfig.json` | TypeScript configuration |
| `tsconfig.app.json` | App-specific TS config |
| `tsconfig.node.json` | Node-specific TS config |
| `vite.config.ts` | Vite bundler config with API proxy |
| `tailwind.config.ts` | Tailwind CSS config |
| `postcss.config.js` | PostCSS with Tailwind plugin |
| `components.json` | shadcn/ui configuration |
| `index.html` | HTML entry point |
| `src/main.tsx` | React root + QueryClientProvider |
| `src/App.tsx` | React Router setup |
| `src/styles/globals.css` | Tailwind base + shadcn/ui CSS vars |
| `src/lib/api.ts` | Fetch wrapper with base URL |
| `src/lib/types.ts` | TypeScript interfaces for backend models |
| `src/lib/utils.ts` | cn() utility for Tailwind class merging |
| `src/hooks/useApi.ts` | TanStack Query hooks |
| `src/hooks/useWebSocket.ts` | WebSocket connection hook |
| `src/components/layout/Layout.tsx` | Main layout shell |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/components/layout/Header.tsx` | Top header bar |
| `src/pages/Dashboard.tsx` | Dashboard placeholder |
| `src/pages/Tasks.tsx` | Tasks list placeholder |
| `src/pages/TaskDetail.tsx` | Task detail placeholder |
| `src/pages/Pipelines.tsx` | Pipelines placeholder |
| `src/pages/Plugins.tsx` | Plugins placeholder |
| `src/pages/Runs.tsx` | Runs list placeholder |
| `src/pages/RunDetail.tsx` | Run detail placeholder |

### Test files
| File | Purpose |
|------|---------|
| `backend/tests/__init__.py` | Package init |
| `backend/tests/conftest.py` | Shared fixtures (settings, db, client) |
| `backend/tests/test_config.py` | Config loading smoke test |
| `backend/tests/test_api/__init__.py` | Package init |
| `backend/tests/test_api/test_health.py` | Health endpoint test |

---

## Task 1: Project Scaffold + .gitignore + Root Docs

**Files:**
- Create: `.gitignore`
- Create: `CLAUDE.md`
- Create: `README.md`
- Create: All `__init__.py` placeholder files (see list below)

- [ ] **Step 1: Create .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
*.egg
dist/
build/
.venv/
venv/

# Node
node_modules/
frontend/dist/

# Environment
.env
!.env.example

# Database
*.db
*.db-journal

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Workspace
repos/

# Alembic
backend/alembic/versions/__pycache__/

# Test / Coverage
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/
```

- [ ] **Step 2: Create CLAUDE.md**

```markdown
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
```

- [ ] **Step 3: Create README.md**

```markdown
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

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

- **Backend:** FastAPI + Celery + SQLAlchemy (async) + LangGraph
- **Frontend:** React + Vite + shadcn/ui + TanStack Query
- **Config:** All settings from `.env` via Pydantic Settings
- **Plugins:** Jira, GitHub, Teams, Outlook — each implements BasePlugin ABC
- **Pipelines:** LangGraph state machines (e.g., Jira ticket → PR)
```

- [ ] **Step 4: Create all empty `__init__.py` placeholder files**

Create each of these as empty files:

```
backend/devagent/__init__.py
backend/devagent/api/__init__.py
backend/devagent/api/routes/__init__.py
backend/devagent/core/__init__.py
backend/devagent/plugins/__init__.py
backend/devagent/plugins/jira/__init__.py
backend/devagent/plugins/github/__init__.py
backend/devagent/plugins/teams/__init__.py
backend/devagent/plugins/outlook/__init__.py
backend/devagent/pipelines/__init__.py
backend/devagent/agents/__init__.py
backend/devagent/models/__init__.py
backend/devagent/workers/__init__.py
backend/tests/__init__.py
backend/tests/test_api/__init__.py
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore CLAUDE.md README.md backend/ backend/tests/
git commit -m "feat: project scaffold with directories, gitignore, and root docs"
```

---

## Task 2: Python Project Config + .env.example

**Files:**
- Create: `backend/pyproject.toml`
- Create: `.env.example`

- [ ] **Step 1: Create backend/pyproject.toml**

```toml
[project]
name = "devagent"
version = "0.1.0"
description = "Local-first AI developer platform"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "pydantic>=2.7.0",
    "pydantic-settings>=2.3.0",
    "sqlalchemy[asyncio]>=2.0.30",
    "aiosqlite>=0.20.0",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "celery[redis]>=5.4.0",
    "redis>=5.0.0",
    "httpx>=0.27.0",
    "cryptography>=42.0.0",
    "python-multipart>=0.0.9",
    "websockets>=12.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.2.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
    "ruff>=0.5.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

- [ ] **Step 2: Create .env.example**

```bash
# =============================================================
# DevAgent Configuration
# Copy to .env and fill in your values: cp .env.example .env
# =============================================================

# ── App ──────────────────────────────────────────────────────
APP_NAME=devagent
APP_ENV=development
APP_PORT=8000
APP_SECRET_KEY=change-me-to-a-random-64-character-string-use-openssl-rand
APP_LOG_LEVEL=INFO
APP_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# ── Database ─────────────────────────────────────────────────
# SQLite (default, zero-config for local dev):
DATABASE_URL=sqlite+aiosqlite:///./devagent.db
# Postgres (uncomment for production):
# DATABASE_URL=postgresql+asyncpg://devagent:password@db:5432/devagent

# ── Redis ────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Celery ───────────────────────────────────────────────────
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# ── Claude Code CLI ──────────────────────────────────────────
CLAUDE_CODE_PATH=claude
CLAUDE_CODE_MAX_TURNS=30
CLAUDE_CODE_TIMEOUT=600
CLAUDE_CODE_ALLOWED_TOOLS=Bash,Read,Write,Edit,MultiEdit,Glob,Grep

# ── Anthropic API (for LLM calls: context assessment, planning) ──
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# ── Jira ─────────────────────────────────────────────────────
JIRA_ENABLED=false
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_DEFAULT_PROJECT=PROJ

# ── GitHub ───────────────────────────────────────────────────
GITHUB_ENABLED=false
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_DEFAULT_ORG=your-org
GITHUB_DEFAULT_BASE_BRANCH=main

# ── GitLab (alternative to GitHub) ───────────────────────────
GITLAB_ENABLED=false
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

# ── Microsoft Teams ──────────────────────────────────────────
TEAMS_ENABLED=false
TEAMS_TENANT_ID=your-azure-tenant-id
TEAMS_CLIENT_ID=your-app-client-id
TEAMS_CLIENT_SECRET=your-app-client-secret
TEAMS_WEBHOOK_URL=

# ── Outlook / Microsoft Graph ────────────────────────────────
OUTLOOK_ENABLED=false
OUTLOOK_TENANT_ID=your-azure-tenant-id
OUTLOOK_CLIENT_ID=your-app-client-id
OUTLOOK_CLIENT_SECRET=your-app-client-secret

# ── Workspace ────────────────────────────────────────────────
WORKSPACE_DIR=/data/repos
WORKSPACE_MAX_DISK_GB=20

# ── Observability (optional) ─────────────────────────────────
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=devagent
```

- [ ] **Step 3: Install dependencies**

```bash
cd backend && uv sync
```

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml .env.example
git commit -m "feat: add pyproject.toml with all dependencies and .env.example"
```

---

## Task 3: Configuration System (Pydantic Settings)

**Files:**
- Create: `backend/devagent/config.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_config.py`:

```python
import os
import pytest
from devagent.config import AppSettings, JiraSettings, GitHubSettings, GitLabSettings, TeamsSettings, OutlookSettings


def test_app_settings_loads_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_SECRET_KEY", "a" * 32)
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
    settings = AppSettings()
    assert settings.app_name == "devagent"
    assert settings.app_env == "development"
    assert settings.app_port == 8000
    assert settings.is_dev is True


def test_app_settings_rejects_short_secret_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_SECRET_KEY", "short")
    with pytest.raises(Exception):  # ValidationError
        AppSettings()


def test_cors_origins_parsed_from_comma_string(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_SECRET_KEY", "a" * 32)
    monkeypatch.setenv("APP_CORS_ORIGINS", "http://a.com, http://b.com")
    settings = AppSettings()
    assert settings.app_cors_origins == ["http://a.com", "http://b.com"]


def test_claude_code_allowed_tools_parsed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_SECRET_KEY", "a" * 32)
    monkeypatch.setenv("CLAUDE_CODE_ALLOWED_TOOLS", "Bash,Read,Write")
    settings = AppSettings()
    assert settings.claude_code_allowed_tools == ["Bash", "Read", "Write"]


def test_jira_settings_defaults_disabled() -> None:
    settings = JiraSettings()
    assert settings.enabled is False


def test_github_settings_defaults_disabled() -> None:
    settings = GitHubSettings()
    assert settings.enabled is False


def test_gitlab_settings_defaults_disabled() -> None:
    settings = GitLabSettings()
    assert settings.enabled is False


def test_teams_settings_defaults_disabled() -> None:
    settings = TeamsSettings()
    assert settings.enabled is False


def test_outlook_settings_defaults_disabled() -> None:
    settings = OutlookSettings()
    assert settings.enabled is False
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_config.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'devagent.config'`

- [ ] **Step 3: Implement config.py**

Create `backend/devagent/config.py`:

```python
from __future__ import annotations

from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App
    app_name: str = "devagent"
    app_env: Literal["development", "staging", "production"] = "development"
    app_port: int = 8000
    app_secret_key: str = Field(..., min_length=32)
    app_log_level: str = "INFO"
    app_cors_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "sqlite+aiosqlite:///./devagent.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Claude Code CLI
    claude_code_path: str = "claude"
    claude_code_max_turns: int = 30
    claude_code_timeout: int = 600
    claude_code_allowed_tools: list[str] = [
        "Bash", "Read", "Write", "Edit", "MultiEdit", "Glob", "Grep",
    ]

    # Anthropic API
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Workspace
    workspace_dir: str = "/data/repos"
    workspace_max_disk_gb: int = 20

    # Observability
    otel_enabled: bool = False
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_service_name: str = "devagent"

    @field_validator("app_cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    @field_validator("claude_code_allowed_tools", mode="before")
    @classmethod
    def parse_tools(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [t.strip() for t in v.split(",")]
        return v

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"


class JiraSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="JIRA_", extra="ignore")
    enabled: bool = False
    base_url: str = ""
    email: str = ""
    api_token: str = ""
    default_project: str = ""


class GitHubSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="GITHUB_", extra="ignore")
    enabled: bool = False
    token: str = ""
    default_org: str = ""
    default_base_branch: str = "main"


class GitLabSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="GITLAB_", extra="ignore")
    enabled: bool = False
    url: str = "https://gitlab.com"
    token: str = ""


class TeamsSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="TEAMS_", extra="ignore")
    enabled: bool = False
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""
    webhook_url: str = ""


class OutlookSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="OUTLOOK_", extra="ignore")
    enabled: bool = False
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""


_settings: AppSettings | None = None


def get_settings() -> AppSettings:
    global _settings
    if _settings is None:
        _settings = AppSettings()
    return _settings
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_config.py -v
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/devagent/config.py backend/tests/test_config.py
git commit -m "feat: add Pydantic Settings config with all integration classes"
```

---

## Task 4: SQLAlchemy Models + Database Layer

**Files:**
- Create: `backend/devagent/models/task.py`
- Create: `backend/devagent/models/run.py`
- Create: `backend/devagent/models/plugin_config.py`
- Create: `backend/devagent/models/__init__.py` (update from empty)
- Create: `backend/devagent/database.py`

- [ ] **Step 1: Create models/task.py**

```python
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, JSON, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TriggerType(str, enum.Enum):
    CRON = "cron"
    WEBHOOK = "webhook"
    MANUAL = "manual"
    EVENT = "event"


class TaskDefinition(Base):
    __tablename__ = "task_definitions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    pipeline: Mapped[str] = mapped_column(String, nullable=False)
    trigger_type: Mapped[TriggerType] = mapped_column(
        SAEnum(TriggerType), default=TriggerType.MANUAL
    )
    trigger_config: Mapped[dict] = mapped_column(JSON, default=dict)
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 2: Create models/run.py**

```python
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from devagent.models.task import Base


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskRun(Base):
    __tablename__ = "task_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    task_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    status: Mapped[RunStatus] = mapped_column(SAEnum(RunStatus), default=RunStatus.PENDING)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    logs: Mapped[list] = mapped_column(JSON, default=list)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
```

- [ ] **Step 3: Create models/plugin_config.py**

```python
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from devagent.models.task import Base


class PluginConfig(Base):
    __tablename__ = "plugin_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    plugin_name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    config_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 4: Update models/__init__.py to re-export**

```python
from devagent.models.task import Base, TaskDefinition, TriggerType
from devagent.models.run import TaskRun, RunStatus
from devagent.models.plugin_config import PluginConfig

__all__ = [
    "Base",
    "TaskDefinition",
    "TriggerType",
    "TaskRun",
    "RunStatus",
    "PluginConfig",
]
```

- [ ] **Step 5: Create database.py**

```python
from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from devagent.models import Base

logger = logging.getLogger(__name__)

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_db(database_url: str) -> None:
    global _engine, _session_factory
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    _engine = create_async_engine(database_url, echo=False, connect_args=connect_args)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database initialized: %s", database_url.split("@")[-1] if "@" in database_url else database_url)


async def get_db() -> AsyncSession:
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    async with _session_factory() as session:
        yield session


def get_engine():
    return _engine
```

- [ ] **Step 6: Commit**

```bash
git add backend/devagent/models/ backend/devagent/database.py
git commit -m "feat: add SQLAlchemy models (TaskDefinition, TaskRun, PluginConfig) and async database layer"
```

---

## Task 5: Alembic Migration Setup

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/001_initial_tables.py`

- [ ] **Step 1: Create alembic.ini**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = sqlite+aiosqlite:///./devagent.db

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 2: Create alembic directory and env.py**

Create `backend/alembic/` directory, then `backend/alembic/env.py`:

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from devagent.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Create alembic/script.py.mako**

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 4: Create initial migration**

Create `backend/alembic/versions/001_initial_tables.py`:

```python
"""Initial tables: task_definitions, task_runs, plugin_configs

Revision ID: 001
Revises:
Create Date: 2026-04-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_definitions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("pipeline", sa.String(), nullable=False),
        sa.Column(
            "trigger_type",
            sa.Enum("cron", "webhook", "manual", "event", name="triggertype"),
            nullable=True,
        ),
        sa.Column("trigger_config", sa.JSON(), nullable=True),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=True),
        sa.Column("notify_on", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "task_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "running", "success", "failed", "cancelled", name="runstatus"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("logs", sa.JSON(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_runs_task_id", "task_runs", ["task_id"])

    op.create_table(
        "plugin_configs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("plugin_name", sa.String(), nullable=False),
        sa.Column("config_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plugin_name"),
    )


def downgrade() -> None:
    op.drop_table("plugin_configs")
    op.drop_index("ix_task_runs_task_id", table_name="task_runs")
    op.drop_table("task_runs")
    op.drop_table("task_definitions")
```

- [ ] **Step 5: Verify migration runs**

```bash
cd backend && uv run alembic upgrade head
```

Expected: Output like `INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial tables`

- [ ] **Step 6: Clean up test database and commit**

```bash
cd backend && rm -f devagent.db
git add backend/alembic.ini backend/alembic/
git commit -m "feat: add Alembic migration setup with initial tables migration"
```

---

## Task 6: Core Utilities (Security)

**Files:**
- Create: `backend/devagent/core/security.py`

- [ ] **Step 1: Create core/security.py**

```python
from __future__ import annotations

import base64
import json

from cryptography.fernet import Fernet


def generate_key(secret: str) -> bytes:
    """Derive a Fernet key from the app secret key (must be 32+ chars)."""
    key_bytes = secret.encode()[:32].ljust(32, b"\0")
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_data(data: dict, secret: str) -> str:
    """Encrypt a dict to a Fernet token string."""
    f = Fernet(generate_key(secret))
    return f.encrypt(json.dumps(data).encode()).decode()


def decrypt_data(token: str, secret: str) -> dict:
    """Decrypt a Fernet token string back to a dict."""
    f = Fernet(generate_key(secret))
    return json.loads(f.decrypt(token.encode()))
```

- [ ] **Step 2: Commit**

```bash
git add backend/devagent/core/security.py
git commit -m "feat: add Fernet encryption utilities for credential storage"
```

---

## Task 7: FastAPI App Factory + API Stubs

**Files:**
- Create: `backend/devagent/app.py`
- Create: `backend/devagent/api/deps.py`
- Create: `backend/devagent/api/routes/tasks.py`
- Create: `backend/devagent/api/routes/runs.py`
- Create: `backend/devagent/api/routes/plugins.py`
- Create: `backend/devagent/api/routes/pipelines.py`
- Create: `backend/devagent/api/routes/ws.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_api/__init__.py` (already empty)
- Create: `backend/tests/test_api/test_health.py`

- [ ] **Step 1: Write API health test**

Create `backend/tests/conftest.py`:

```python
import os
import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("APP_SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")


@pytest.fixture
async def client():
    from devagent.app import create_app

    app = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
```

Create `backend/tests/test_api/test_health.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_list_tasks_returns_empty(client):
    resp = await client.get("/api/tasks")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_runs_returns_empty(client):
    resp = await client.get("/api/runs")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_plugins_returns_empty(client):
    resp = await client.get("/api/plugins")
    assert resp.status_code == 200
    assert resp.json() == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_api/test_health.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'devagent.app'`

- [ ] **Step 3: Create api/deps.py**

```python
from __future__ import annotations

from devagent.config import AppSettings, get_settings
from devagent.database import get_db as _get_db


async def get_db():
    async for session in _get_db():
        yield session


def get_app_settings() -> AppSettings:
    return get_settings()
```

- [ ] **Step 4: Create api/routes/tasks.py**

```python
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["tasks"])


@router.get("/")
async def list_tasks() -> list:
    return []


@router.post("/")
async def create_task() -> dict:
    return {"status": "not_implemented"}


@router.get("/{task_id}")
async def get_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}


@router.put("/{task_id}")
async def update_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}


@router.delete("/{task_id}")
async def delete_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}


@router.post("/{task_id}/trigger")
async def trigger_task(task_id: str) -> dict:
    return {"status": "not_implemented", "task_id": task_id}
```

- [ ] **Step 5: Create api/routes/runs.py**

```python
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["runs"])


@router.get("/")
async def list_runs() -> list:
    return []


@router.get("/{run_id}")
async def get_run(run_id: str) -> dict:
    return {"status": "not_implemented", "run_id": run_id}
```

- [ ] **Step 6: Create api/routes/plugins.py**

```python
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["plugins"])


@router.get("/")
async def list_plugins() -> list:
    return []
```

- [ ] **Step 7: Create api/routes/pipelines.py**

```python
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["pipelines"])


@router.get("/")
async def list_pipelines() -> list:
    return []


@router.post("/{pipeline_id}/run")
async def run_pipeline(pipeline_id: str) -> dict:
    return {"status": "not_implemented", "pipeline_id": pipeline_id}
```

- [ ] **Step 8: Create api/routes/ws.py**

```python
from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/logs/{run_id}")
async def stream_logs(websocket: WebSocket, run_id: str) -> None:
    await websocket.accept()
    await websocket.send_json({"type": "info", "message": f"Connected to run {run_id} logs"})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
```

- [ ] **Step 9: Create app.py**

```python
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

    from devagent.api.routes import tasks, runs, plugins, pipelines, ws

    app.include_router(tasks.router, prefix="/api/tasks")
    app.include_router(runs.router, prefix="/api/runs")
    app.include_router(plugins.router, prefix="/api/plugins")
    app.include_router(pipelines.router, prefix="/api/pipelines")
    app.include_router(ws.router, prefix="/ws")

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app
```

- [ ] **Step 10: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: All tests pass (config tests from Task 3 + health/stub tests).

- [ ] **Step 11: Commit**

```bash
git add backend/devagent/app.py backend/devagent/api/ backend/tests/
git commit -m "feat: add FastAPI app factory with health endpoint and API route stubs"
```

---

## Task 8: Celery Worker Infrastructure

**Files:**
- Create: `backend/devagent/workers/celery_app.py`
- Create: `backend/devagent/workers/tasks.py`

- [ ] **Step 1: Create workers/celery_app.py**

```python
from __future__ import annotations

from celery import Celery

from devagent.config import get_settings


def create_celery_app() -> Celery:
    settings = get_settings()
    app = Celery(
        "devagent",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        beat_schedule={},
    )
    app.autodiscover_tasks(["devagent.workers"])
    return app


celery_app = create_celery_app()
```

- [ ] **Step 2: Create workers/tasks.py**

```python
from __future__ import annotations

from devagent.workers.celery_app import celery_app


@celery_app.task(name="devagent.health_check")
def health_check() -> dict:
    """Simple ping task to verify worker connectivity."""
    return {"status": "ok", "worker": "devagent"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/devagent/workers/
git commit -m "feat: add Celery app factory with health check task"
```

---

## Task 9: Docker Compose + Dockerfiles

**Files:**
- Create: `docker-compose.yml`
- Create: `Dockerfile.api`
- Create: `Dockerfile.worker`
- Create: `Dockerfile.ui`

- [ ] **Step 1: Create Dockerfile.api**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev --no-install-project

# Copy application code
COPY backend/ .

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "devagent.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create Dockerfile.worker**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev --no-install-project

# Copy application code
COPY backend/ .

ENV PATH="/app/.venv/bin:$PATH"

CMD ["celery", "-A", "devagent.workers.celery_app:celery_app", "worker", "--loglevel=INFO", "--concurrency=4"]
```

- [ ] **Step 3: Create Dockerfile.ui**

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    env_file: .env
    ports:
      - "${APP_PORT:-8000}:8000"
    volumes:
      - ${WORKSPACE_DIR:-./repos}:/data/repos
    depends_on:
      - redis
      - db
    command: uvicorn devagent.app:create_app --factory --host 0.0.0.0 --port 8000 --reload

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    env_file: .env
    volumes:
      - ${WORKSPACE_DIR:-./repos}:/data/repos
    depends_on:
      - redis
      - db

  scheduler:
    build:
      context: .
      dockerfile: Dockerfile.worker
    env_file: .env
    depends_on:
      - redis
    command: celery -A devagent.workers.celery_app:celery_app beat --loglevel=${APP_LOG_LEVEL:-INFO}

  ui:
    build:
      context: .
      dockerfile: Dockerfile.ui
    ports:
      - "3000:3000"
    depends_on:
      - api

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: devagent
      POSTGRES_USER: devagent
      POSTGRES_PASSWORD: ${DB_PASSWORD:-devagent}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  redis-data:
  pgdata:
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml Dockerfile.api Dockerfile.worker Dockerfile.ui
git commit -m "feat: add Docker Compose with all services and Dockerfiles"
```

---

## Task 10: Makefile

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Create Makefile**

```makefile
.PHONY: dev dev-backend dev-frontend test lint migrate new-migration docker-up docker-down clean

# Development
dev:
	@echo "Starting backend and frontend dev servers..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uv run uvicorn devagent.app:create_app --factory --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

# Testing
test:
	cd backend && uv run pytest tests/ -v

# Linting
lint:
	cd backend && uv run ruff check devagent/ tests/
	cd backend && uv run ruff format --check devagent/ tests/

# Database
migrate:
	cd backend && uv run alembic upgrade head

new-migration:
	cd backend && uv run alembic revision --autogenerate -m "$(msg)"

# Docker
docker-up:
	docker compose up -d

docker-down:
	docker compose down

# Cleanup
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -f backend/devagent.db backend/test.db
```

- [ ] **Step 2: Commit**

```bash
git add Makefile
git commit -m "feat: add Makefile with dev, test, lint, migrate, and docker targets"
```

---

## Task 11: Frontend Scaffold — Project Init + Config

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/components.json`
- Create: `frontend/index.html`

- [ ] **Step 1: Initialize Vite + React + TS project**

```bash
cd /Users/srinathreddy/Documents/project_superposition/devagent && npm create vite@latest frontend -- --template react-ts
```

If the `frontend/` directory already has files, remove and re-init:
```bash
rm -rf frontend && npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend && npm install react-router-dom @tanstack/react-query && npm install -D tailwindcss @tailwindcss/vite clsx tailwind-merge
```

- [ ] **Step 3: Update vite.config.ts with API proxy and Tailwind**

Replace `frontend/vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create src/styles/globals.css**

Create `frontend/src/styles/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: Create src/lib/utils.ts**

Create `frontend/src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Vite + React + TypeScript frontend with Tailwind CSS"
```

---

## Task 12: Frontend — Types + API Client + Hooks

**Files:**
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useApi.ts`
- Create: `frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Create src/lib/types.ts**

```typescript
export interface Task {
  id: string;
  name: string;
  pipeline: string;
  trigger_type: "cron" | "webhook" | "manual" | "event";
  trigger_config: Record<string, unknown>;
  params: Record<string, unknown>;
  enabled: boolean;
  notify_on: string[];
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  task_id: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  started_at: string;
  finished_at: string | null;
  logs: LogEntry[];
  result: Record<string, unknown> | null;
  error: string | null;
  retry_count: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface Plugin {
  name: string;
  healthy: boolean;
  message: string;
  capabilities: string[];
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
}
```

- [ ] **Step 2: Create src/lib/api.ts**

```typescript
const API_BASE = "/api";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  tasks: {
    list: () => fetchApi<[]>("/tasks"),
    get: (id: string) => fetchApi(`/tasks/${id}`),
    create: (data: Record<string, unknown>) =>
      fetchApi("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/tasks/${id}`, { method: "DELETE" }),
    trigger: (id: string) =>
      fetchApi(`/tasks/${id}/trigger`, { method: "POST" }),
  },
  runs: {
    list: () => fetchApi<[]>("/runs"),
    get: (id: string) => fetchApi(`/runs/${id}`),
  },
  plugins: {
    list: () => fetchApi<[]>("/plugins"),
  },
  pipelines: {
    list: () => fetchApi<[]>("/pipelines"),
    run: (id: string) =>
      fetchApi(`/pipelines/${id}/run`, { method: "POST" }),
  },
  health: () => fetchApi<{ status: string }>("/health"),
};
```

- [ ] **Step 3: Create src/hooks/useApi.ts**

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Task, Run, Plugin, Pipeline } from "@/lib/types";

export function useTasks() {
  return useQuery<Task[]>({ queryKey: ["tasks"], queryFn: api.tasks.list });
}

export function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
  });
}

export function useRuns() {
  return useQuery<Run[]>({ queryKey: ["runs"], queryFn: api.runs.list });
}

export function useRun(id: string) {
  return useQuery<Run>({
    queryKey: ["runs", id],
    queryFn: () => api.runs.get(id),
    enabled: !!id,
  });
}

export function usePlugins() {
  return useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: api.plugins.list,
  });
}

export function usePipelines() {
  return useQuery<Pipeline[]>({
    queryKey: ["pipelines"],
    queryFn: api.pipelines.list,
  });
}
```

- [ ] **Step 4: Create src/hooks/useWebSocket.ts**

```typescript
import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  message: string;
  timestamp?: string;
}

export function useWebSocket(runId: string | null) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!runId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${runId}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as WebSocketMessage;
      setMessages((prev) => [...prev, data]);
    };

    wsRef.current = ws;
  }, [runId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { messages, connected };
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ frontend/src/hooks/
git commit -m "feat: add TypeScript types, API client, and TanStack Query hooks"
```

---

## Task 13: Frontend — Layout Components

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/Layout.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "~" },
  { to: "/tasks", label: "Tasks", icon: "#" },
  { to: "/pipelines", label: "Pipelines", icon: ">" },
  { to: "/plugins", label: "Plugins", icon: "+" },
  { to: "/runs", label: "Runs", icon: "=" },
];

export function Sidebar() {
  return (
    <aside className="w-60 border-r border-border bg-card h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold">DevAgent</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`
            }
          >
            <span className="w-4 text-center font-mono">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create Header.tsx**

```tsx
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/pipelines": "Pipelines",
  "/plugins": "Plugins",
  "/runs": "Runs",
};

export function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "DevAgent";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6">
      <h2 className="text-lg font-medium">{title}</h2>
    </header>
  );
}
```

- [ ] **Step 3: Create Layout.tsx**

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add layout components (Sidebar, Header, Layout)"
```

---

## Task 14: Frontend — Page Shells + Routing

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/Tasks.tsx`
- Create: `frontend/src/pages/TaskDetail.tsx`
- Create: `frontend/src/pages/Pipelines.tsx`
- Create: `frontend/src/pages/Plugins.tsx`
- Create: `frontend/src/pages/Runs.tsx`
- Create: `frontend/src/pages/RunDetail.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create all page shells**

Create `frontend/src/pages/Dashboard.tsx`:

```tsx
export default function Dashboard() {
  return (
    <div>
      <p className="text-muted-foreground">
        Overview of recent runs, plugin status, and quick actions.
      </p>
    </div>
  );
}
```

Create `frontend/src/pages/Tasks.tsx`:

```tsx
export default function Tasks() {
  return (
    <div>
      <p className="text-muted-foreground">
        Manage scheduled task definitions.
      </p>
    </div>
  );
}
```

Create `frontend/src/pages/TaskDetail.tsx`:

```tsx
import { useParams } from "react-router-dom";

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return (
    <div>
      <p className="text-muted-foreground">Task: {taskId}</p>
    </div>
  );
}
```

Create `frontend/src/pages/Pipelines.tsx`:

```tsx
export default function Pipelines() {
  return (
    <div>
      <p className="text-muted-foreground">
        Available pipelines and manual trigger UI.
      </p>
    </div>
  );
}
```

Create `frontend/src/pages/Plugins.tsx`:

```tsx
export default function Plugins() {
  return (
    <div>
      <p className="text-muted-foreground">
        Integration status and health checks.
      </p>
    </div>
  );
}
```

Create `frontend/src/pages/Runs.tsx`:

```tsx
export default function Runs() {
  return (
    <div>
      <p className="text-muted-foreground">
        Run history with filtering.
      </p>
    </div>
  );
}
```

Create `frontend/src/pages/RunDetail.tsx`:

```tsx
import { useParams } from "react-router-dom";

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  return (
    <div>
      <p className="text-muted-foreground">Run: {runId}</p>
    </div>
  );
}
```

- [ ] **Step 2: Replace App.tsx with router setup**

Replace `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import Pipelines from "@/pages/Pipelines";
import Plugins from "@/pages/Plugins";
import Runs from "@/pages/Runs";
import RunDetail from "@/pages/RunDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/pipelines" element={<Pipelines />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:runId" element={<RunDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Replace main.tsx with QueryClientProvider**

Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 4: Update index.html**

Replace `frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevAgent</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: add page shells, React Router setup, and QueryClientProvider"
```

---

## Task 15: Verification — End-to-End Smoke Test

**Files:** No new files — this task verifies everything works together.

- [ ] **Step 1: Create .env from .env.example**

```bash
cd /Users/srinathreddy/Documents/project_superposition/devagent
cp .env.example .env
# Set a valid secret key
sed -i '' 's/change-me-to-a-random-64-character-string-use-openssl-rand/thisisaverylongsecretkeyfordevagentatleast32chars/' .env
```

- [ ] **Step 2: Run database migration**

```bash
make migrate
```

Expected: `INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial tables`

- [ ] **Step 3: Run all backend tests**

```bash
make test
```

Expected: All tests pass.

- [ ] **Step 4: Run linter**

```bash
make lint
```

Expected: No errors. If there are ruff errors, fix them and re-run.

- [ ] **Step 5: Test backend starts**

```bash
cd backend && uv run uvicorn devagent.app:create_app --factory --host 0.0.0.0 --port 8000 &
sleep 2
curl http://localhost:8000/api/health
curl http://localhost:8000/api/tasks
curl http://localhost:8000/api/runs
curl http://localhost:8000/api/plugins
kill %1
```

Expected:
- `/api/health` → `{"status":"ok"}`
- `/api/tasks` → `[]`
- `/api/runs` → `[]`
- `/api/plugins` → `[]`

- [ ] **Step 6: Test frontend dev server starts**

```bash
cd frontend && npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML response with `<div id="root">` present.

- [ ] **Step 7: Clean up and commit any fixes**

```bash
rm -f backend/devagent.db backend/test.db .env
git add -A
git status
# If there are lint fixes or other changes:
git commit -m "fix: address lint issues from verification"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Project scaffold with all directories → Task 1
- [x] `.env.example` → Task 2
- [x] `pyproject.toml` with uv → Task 2
- [x] Pydantic Settings config → Task 3
- [x] SQLAlchemy models (TaskDefinition, TaskRun, PluginConfig) → Task 4
- [x] Database layer (async engine, session) → Task 4
- [x] Alembic migrations → Task 5
- [x] Core security (Fernet) → Task 6
- [x] FastAPI app factory + all route stubs → Task 7
- [x] Celery app factory + health task → Task 8
- [x] Docker Compose + Dockerfiles → Task 9
- [x] Makefile → Task 10
- [x] Frontend scaffold (Vite + React + TS + Tailwind) → Task 11
- [x] TypeScript types + API client + hooks → Task 12
- [x] Layout components → Task 13
- [x] Page shells + routing → Task 14
- [x] CLAUDE.md → Task 1
- [x] README.md → Task 1
- [x] .gitignore → Task 1
- [x] Verification → Task 15

**Placeholder scan:** No TBD/TODO items found.

**Type consistency:**
- `TaskDefinition`, `TaskRun`, `PluginConfig` — model names consistent across Tasks 4, 5, 7
- `TriggerType`, `RunStatus` — enum names consistent across Tasks 4, 12 (TS types)
- `get_settings()`, `get_db()` — function names consistent across Tasks 3, 7
- `create_app()`, `celery_app` — factory names consistent across Tasks 7, 8, 9
- TS types in Task 12 match the Python model fields in Task 4
