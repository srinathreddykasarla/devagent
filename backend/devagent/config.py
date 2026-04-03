from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import Field, field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings.sources.base import PydanticBaseSettingsSource
from pydantic_settings.sources.providers.env import EnvSettingsSource


class _LenientEnvSettingsSource(EnvSettingsSource):
    """EnvSettingsSource that falls back to returning the raw string when JSON
    decoding fails for complex fields.  This lets ``field_validator`` callables
    handle non-JSON formats such as comma-separated lists."""

    def decode_complex_value(self, field_name: str, field: FieldInfo, value: Any) -> Any:
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError, TypeError):
            return value


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            _LenientEnvSettingsSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )

    # App
    app_name: str = "devagent"
    app_env: Literal["development", "staging", "production"] = "development"
    app_port: int = 8000
    app_secret_key: str = Field(..., min_length=32)
    app_log_level: str = "INFO"
    app_cors_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "sqlite+aiosqlite:///./dev_data/db/devagent.db"

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
        "Bash",
        "Read",
        "Write",
        "Edit",
        "MultiEdit",
        "Glob",
        "Grep",
    ]

    # Anthropic API
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Workspace
    workspace_dir: str = "./dev_data/repos"
    workspace_max_disk_gb: int = 20

    # Logs
    log_dir: str = "./dev_data/logs"

    # Attachments
    attachments_dir: str = "./dev_data/attachments"

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
