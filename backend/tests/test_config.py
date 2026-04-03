import pytest

from devagent.config import (
    AppSettings,
    GitHubSettings,
    GitLabSettings,
    JiraSettings,
    OutlookSettings,
    TeamsSettings,
)


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
