# Phase 2 Track A: Plugin System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the plugin architecture (base ABC, registry, 4 plugin implementations) and wire it into the FastAPI app so `/api/plugins` returns live health status for all enabled integrations.

**Architecture:** Each plugin implements `BasePlugin` ABC with `initialize()`, `health_check()`, `execute()`, and `shutdown()`. A `PluginRegistry` auto-discovers and initializes enabled plugins at startup based on `.env` settings. Plugins use `httpx.AsyncClient` for all external HTTP calls. The registry is stored on `app.state.plugins` and injected into routes via FastAPI dependencies.

**Tech Stack:** Python 3.12+, httpx (async HTTP), FastAPI dependency injection, Pydantic Settings (already in config.py)

---

## File Map

| File | Purpose |
|------|---------|
| `backend/devagent/plugins/base.py` | `BasePlugin` ABC, `PluginCapability` enum, `PluginHealth` model, `PluginNotFoundError` |
| `backend/devagent/plugins/registry.py` | `PluginRegistry` — auto-register enabled plugins, get/list |
| `backend/devagent/plugins/jira/client.py` | `AsyncJiraClient` — httpx-based Jira REST API v3 client |
| `backend/devagent/plugins/jira/plugin.py` | `JiraPlugin(BasePlugin)` — read tickets, post comments, download attachments |
| `backend/devagent/plugins/github/client.py` | `AsyncGitHubClient` — httpx-based GitHub REST API + async git operations |
| `backend/devagent/plugins/github/plugin.py` | `GitHubPlugin(BasePlugin)` — clone, branch, commit, push, create PR |
| `backend/devagent/plugins/teams/client.py` | `AsyncTeamsClient` — MS Graph API client for Teams |
| `backend/devagent/plugins/teams/plugin.py` | `TeamsPlugin(BasePlugin)` — send notifications via webhook |
| `backend/devagent/plugins/outlook/client.py` | `AsyncOutlookClient` — MS Graph API client for mail |
| `backend/devagent/plugins/outlook/plugin.py` | `OutlookPlugin(BasePlugin)` — send email notifications |
| Modify: `backend/devagent/app.py` | Add plugin registry init to lifespan, store on `app.state.plugins` |
| Modify: `backend/devagent/api/deps.py` | Add `get_plugins()` dependency |
| Modify: `backend/devagent/api/routes/plugins.py` | Replace stub with real health-check list |
| `backend/tests/test_plugins/__init__.py` | Package init |
| `backend/tests/test_plugins/test_base.py` | Tests for BasePlugin, PluginCapability, PluginHealth |
| `backend/tests/test_plugins/test_registry.py` | Tests for PluginRegistry auto-registration |
| `backend/tests/test_plugins/test_jira.py` | Tests for JiraPlugin + AsyncJiraClient |
| `backend/tests/test_plugins/test_github.py` | Tests for GitHubPlugin + AsyncGitHubClient |
| `backend/tests/test_plugins/test_api_plugins.py` | Tests for /api/plugins endpoint with registry |

---

## Task 1: Base Plugin Interface

**Files:**
- Create: `backend/devagent/plugins/base.py`
- Create: `backend/tests/test_plugins/__init__.py`
- Create: `backend/tests/test_plugins/test_base.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_plugins/__init__.py` (empty file).

Create `backend/tests/test_plugins/test_base.py`:

```python
import pytest

from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth, PluginNotFoundError


def test_plugin_capability_values():
    assert PluginCapability.READ_TICKETS == "read_tickets"
    assert PluginCapability.POST_COMMENT == "post_comment"
    assert PluginCapability.CREATE_PR == "create_pr"
    assert PluginCapability.CLONE_REPO == "clone_repo"
    assert PluginCapability.CREATE_BRANCH == "create_branch"
    assert PluginCapability.SEND_NOTIFICATION == "send_notification"
    assert PluginCapability.SEND_EMAIL == "send_email"
    assert PluginCapability.WEBHOOK_TRIGGER == "webhook_trigger"


def test_plugin_health_model():
    healthy = PluginHealth(healthy=True, message="Connected")
    assert healthy.healthy is True
    assert healthy.message == "Connected"

    unhealthy = PluginHealth(healthy=False, message="Connection refused")
    assert unhealthy.healthy is False


def test_plugin_not_found_error():
    err = PluginNotFoundError("jira")
    assert "jira" in str(err)


class DummyPlugin(BasePlugin):
    name = "dummy"
    description = "A test plugin"
    capabilities = [PluginCapability.READ_TICKETS]

    async def initialize(self) -> None:
        self._initialized = True

    async def health_check(self) -> PluginHealth:
        return PluginHealth(healthy=True, message="ok")

    async def execute(self, action: str, params: dict) -> dict:
        return {"action": action, "params": params}


@pytest.mark.asyncio
async def test_base_plugin_can_be_subclassed():
    plugin = DummyPlugin()
    await plugin.initialize()
    assert plugin._initialized is True
    health = await plugin.health_check()
    assert health.healthy is True
    result = await plugin.execute("read_ticket", {"ticket_id": "TEST-1"})
    assert result == {"action": "read_ticket", "params": {"ticket_id": "TEST-1"}}


@pytest.mark.asyncio
async def test_base_plugin_shutdown_is_optional():
    plugin = DummyPlugin()
    plugin.shutdown()  # should not raise
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_plugins/test_base.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'devagent.plugins.base'` (the file is currently empty `__init__.py`)

- [ ] **Step 3: Implement base.py**

Create `backend/devagent/plugins/base.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from enum import StrEnum

from pydantic import BaseModel


class PluginCapability(StrEnum):
    READ_TICKETS = "read_tickets"
    POST_COMMENT = "post_comment"
    CREATE_PR = "create_pr"
    CLONE_REPO = "clone_repo"
    CREATE_BRANCH = "create_branch"
    SEND_NOTIFICATION = "send_notification"
    SEND_EMAIL = "send_email"
    WEBHOOK_TRIGGER = "webhook_trigger"


class PluginHealth(BaseModel):
    healthy: bool
    message: str


class PluginNotFoundError(Exception):
    pass


class BasePlugin(ABC):
    name: str
    description: str
    capabilities: list[PluginCapability]

    @abstractmethod
    async def initialize(self) -> None:
        """Called once when plugin is loaded. Set up HTTP clients, validate creds."""

    @abstractmethod
    async def health_check(self) -> PluginHealth:
        """Verify credentials and connectivity."""

    @abstractmethod
    async def execute(self, action: str, params: dict) -> dict:
        """Execute a capability action."""

    def shutdown(self) -> None:
        """Optional cleanup on app shutdown."""
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && uv run pytest tests/test_plugins/test_base.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/devagent/plugins/base.py backend/tests/test_plugins/
git commit -m "feat: add BasePlugin ABC with capabilities, health model, and error types"
```

---

## Task 2: Plugin Registry

**Files:**
- Create: `backend/devagent/plugins/registry.py`
- Create: `backend/tests/test_plugins/test_registry.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_plugins/test_registry.py`:

```python
import pytest

from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth, PluginNotFoundError
from devagent.plugins.registry import PluginRegistry


class FakePlugin(BasePlugin):
    name = "fake"
    description = "Fake plugin for testing"
    capabilities = [PluginCapability.READ_TICKETS]

    def __init__(self, healthy: bool = True):
        self._healthy = healthy

    async def initialize(self) -> None:
        pass

    async def health_check(self) -> PluginHealth:
        return PluginHealth(healthy=self._healthy, message="ok" if self._healthy else "fail")

    async def execute(self, action: str, params: dict) -> dict:
        return {"action": action}


class FailingInitPlugin(BasePlugin):
    name = "broken"
    description = "Plugin that fails to initialize"
    capabilities = []

    async def initialize(self) -> None:
        raise ConnectionError("Cannot connect")

    async def health_check(self) -> PluginHealth:
        return PluginHealth(healthy=False, message="never reached")

    async def execute(self, action: str, params: dict) -> dict:
        return {}


@pytest.mark.asyncio
async def test_registry_register_and_get():
    registry = PluginRegistry()
    plugin = FakePlugin()
    await registry.register(plugin)
    assert registry.get("fake") is plugin


@pytest.mark.asyncio
async def test_registry_get_unknown_raises():
    registry = PluginRegistry()
    with pytest.raises(PluginNotFoundError):
        registry.get("nonexistent")


@pytest.mark.asyncio
async def test_registry_list_enabled():
    registry = PluginRegistry()
    await registry.register(FakePlugin())
    enabled = registry.list_enabled()
    assert len(enabled) == 1
    assert enabled[0]["name"] == "fake"
    assert "read_tickets" in enabled[0]["capabilities"]


@pytest.mark.asyncio
async def test_registry_failing_plugin_is_skipped():
    registry = PluginRegistry()
    plugin = FailingInitPlugin()
    await registry.register(plugin)  # should not raise, just log warning
    assert "broken" not in registry._plugins
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_plugins/test_registry.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'devagent.plugins.registry'`

- [ ] **Step 3: Implement registry.py**

Create `backend/devagent/plugins/registry.py`:

```python
from __future__ import annotations

import logging

from devagent.plugins.base import BasePlugin, PluginNotFoundError

logger = logging.getLogger(__name__)


class PluginRegistry:
    def __init__(self) -> None:
        self._plugins: dict[str, BasePlugin] = {}

    async def register(self, plugin: BasePlugin) -> None:
        """Initialize a plugin and add it to the registry. Logs and skips on failure."""
        try:
            await plugin.initialize()
            health = await plugin.health_check()
            self._plugins[plugin.name] = plugin
            logger.info("Plugin '%s' loaded: %s", plugin.name, health.message)
        except Exception as e:
            logger.warning("Plugin '%s' failed to initialize: %s", plugin.name, e)

    def get(self, name: str) -> BasePlugin:
        if name not in self._plugins:
            raise PluginNotFoundError(f"Plugin '{name}' not registered. Enable in .env.")
        return self._plugins[name]

    def list_enabled(self) -> list[dict]:
        return [
            {
                "name": p.name,
                "description": p.description,
                "capabilities": [c.value for c in p.capabilities],
            }
            for p in self._plugins.values()
        ]

    async def health_check_all(self) -> list[dict]:
        """Run health checks on all registered plugins and return results."""
        results = []
        for plugin in self._plugins.values():
            try:
                health = await plugin.health_check()
                results.append({
                    "name": plugin.name,
                    "healthy": health.healthy,
                    "message": health.message,
                    "capabilities": [c.value for c in plugin.capabilities],
                })
            except Exception as e:
                results.append({
                    "name": plugin.name,
                    "healthy": False,
                    "message": str(e),
                    "capabilities": [c.value for c in plugin.capabilities],
                })
        return results

    def shutdown_all(self) -> None:
        for plugin in self._plugins.values():
            try:
                plugin.shutdown()
            except Exception as e:
                logger.warning("Plugin '%s' shutdown error: %s", plugin.name, e)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && uv run pytest tests/test_plugins/test_registry.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/devagent/plugins/registry.py backend/tests/test_plugins/test_registry.py
git commit -m "feat: add PluginRegistry with register, get, list, and health check"
```

---

## Task 3: Jira Plugin (Client + Plugin)

**Files:**
- Create: `backend/devagent/plugins/jira/client.py`
- Create: `backend/devagent/plugins/jira/plugin.py`
- Create: `backend/tests/test_plugins/test_jira.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_plugins/test_jira.py`:

```python
import pytest
import httpx

from devagent.plugins.jira.client import AsyncJiraClient
from devagent.plugins.jira.plugin import JiraPlugin
from devagent.config import JiraSettings
from devagent.plugins.base import PluginCapability, PluginHealth


class MockTransport(httpx.MockTransport):
    pass


def make_jira_transport():
    """Returns an httpx mock transport that fakes Jira REST API v3 responses."""

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if path == "/rest/api/3/myself":
            return httpx.Response(200, json={"displayName": "Test User", "accountId": "abc123"})

        if path.startswith("/rest/api/3/issue/") and path.endswith("/comment"):
            if request.method == "GET":
                return httpx.Response(200, json={
                    "comments": [
                        {"author": {"displayName": "Alice"}, "body": "A comment", "created": "2026-01-01T00:00:00Z"}
                    ]
                })
            if request.method == "POST":
                return httpx.Response(201, json={"id": "10001"})

        if path.startswith("/rest/api/3/issue/"):
            return httpx.Response(200, json={
                "fields": {
                    "summary": "Fix the login bug",
                    "description": "Users cannot log in",
                    "issuetype": {"name": "Bug"},
                    "priority": {"name": "High"},
                    "status": {"name": "To Do"},
                    "labels": ["backend"],
                    "components": [{"name": "auth"}],
                    "attachment": [
                        {"filename": "screenshot.png", "mimeType": "image/png", "size": 1024, "content": "https://jira.example.com/attachment/1"}
                    ],
                }
            })

        return httpx.Response(404, json={"error": "not found"})

    return MockTransport(handler)


@pytest.fixture
def jira_client():
    transport = make_jira_transport()
    client = AsyncJiraClient(
        base_url="https://test.atlassian.net",
        email="test@test.com",
        api_token="fake-token",
    )
    client._client = httpx.AsyncClient(
        base_url="https://test.atlassian.net/rest/api/3",
        transport=transport,
    )
    return client


@pytest.mark.asyncio
async def test_jira_client_get_myself(jira_client):
    user = await jira_client.get_myself()
    assert user["displayName"] == "Test User"


@pytest.mark.asyncio
async def test_jira_client_get_issue(jira_client):
    issue = await jira_client.get_issue("TEST-1")
    assert issue["fields"]["summary"] == "Fix the login bug"


@pytest.mark.asyncio
async def test_jira_client_get_comments(jira_client):
    comments = await jira_client.get_comments("TEST-1")
    assert len(comments) == 1
    assert comments[0]["author"]["displayName"] == "Alice"


@pytest.mark.asyncio
async def test_jira_client_add_comment(jira_client):
    result = await jira_client.add_comment("TEST-1", "Hello from DevAgent")
    assert result["id"] == "10001"


@pytest.mark.asyncio
async def test_jira_plugin_capabilities():
    settings = JiraSettings(enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok")
    plugin = JiraPlugin(settings)
    assert PluginCapability.READ_TICKETS in plugin.capabilities
    assert PluginCapability.POST_COMMENT in plugin.capabilities


@pytest.mark.asyncio
async def test_jira_plugin_health_check(jira_client):
    settings = JiraSettings(enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok")
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    health = await plugin.health_check()
    assert health.healthy is True
    assert "Test User" in health.message


@pytest.mark.asyncio
async def test_jira_plugin_execute_read_ticket(jira_client):
    settings = JiraSettings(enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok")
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    result = await plugin.execute("read_ticket", {"ticket_id": "TEST-1"})
    assert result["ticket_id"] == "TEST-1"
    assert result["summary"] == "Fix the login bug"
    assert len(result["comments"]) == 1


@pytest.mark.asyncio
async def test_jira_plugin_execute_post_comment(jira_client):
    settings = JiraSettings(enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok")
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    result = await plugin.execute("post_comment", {"ticket_id": "TEST-1", "body": "Hello"})
    assert result["id"] == "10001"


@pytest.mark.asyncio
async def test_jira_plugin_execute_unknown_action(jira_client):
    settings = JiraSettings(enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok")
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    with pytest.raises(ValueError, match="Unknown action"):
        await plugin.execute("delete_ticket", {})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_plugins/test_jira.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'devagent.plugins.jira.client'`

- [ ] **Step 3: Implement jira/client.py**

Create `backend/devagent/plugins/jira/client.py`:

```python
from __future__ import annotations

import base64

import httpx


class AsyncJiraClient:
    def __init__(self, base_url: str, email: str, api_token: str) -> None:
        auth = base64.b64encode(f"{email}:{api_token}".encode()).decode()
        self._client = httpx.AsyncClient(
            base_url=f"{base_url.rstrip('/')}/rest/api/3",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    async def get_myself(self) -> dict:
        r = await self._client.get("/myself")
        r.raise_for_status()
        return r.json()

    async def get_issue(self, issue_key: str, expand: str = "") -> dict:
        params = {"expand": expand} if expand else {}
        r = await self._client.get(f"/issue/{issue_key}", params=params)
        r.raise_for_status()
        return r.json()

    async def get_comments(self, issue_key: str) -> list[dict]:
        r = await self._client.get(f"/issue/{issue_key}/comment", params={"orderBy": "created"})
        r.raise_for_status()
        return r.json().get("comments", [])

    async def add_comment(self, issue_key: str, body: str) -> dict:
        payload = {
            "body": {
                "version": 1,
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": body}]}
                ],
            }
        }
        r = await self._client.post(f"/issue/{issue_key}/comment", json=payload)
        r.raise_for_status()
        return r.json()

    async def download_attachment(self, url: str) -> bytes:
        r = await self._client.get(url)
        r.raise_for_status()
        return r.content

    async def close(self) -> None:
        await self._client.aclose()
```

- [ ] **Step 4: Implement jira/plugin.py**

Create `backend/devagent/plugins/jira/plugin.py`:

```python
from __future__ import annotations

from devagent.config import JiraSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.jira.client import AsyncJiraClient


class JiraPlugin(BasePlugin):
    name = "jira"
    description = "Atlassian Jira — read tickets, comments, attachments, post comments"
    capabilities = [PluginCapability.READ_TICKETS, PluginCapability.POST_COMMENT]

    def __init__(self, settings: JiraSettings) -> None:
        self.settings = settings
        self._client: AsyncJiraClient | None = None

    async def initialize(self) -> None:
        self._client = AsyncJiraClient(
            base_url=self.settings.base_url,
            email=self.settings.email,
            api_token=self.settings.api_token,
        )

    async def health_check(self) -> PluginHealth:
        try:
            user = await self._client.get_myself()
            return PluginHealth(healthy=True, message=f"Connected as {user['displayName']}")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "read_ticket":
                return await self._read_ticket(params["ticket_id"])
            case "post_comment":
                return await self._client.add_comment(params["ticket_id"], params["body"])
            case "download_attachments":
                return await self._download_attachments(params["ticket_id"])
            case _:
                raise ValueError(f"Unknown action: {action}")

    async def _read_ticket(self, ticket_id: str) -> dict:
        issue = await self._client.get_issue(ticket_id, expand="renderedFields")
        comments = await self._client.get_comments(ticket_id)
        return {
            "ticket_id": ticket_id,
            "summary": issue["fields"]["summary"],
            "description": issue["fields"]["description"],
            "type": issue["fields"]["issuetype"]["name"],
            "priority": issue["fields"]["priority"]["name"],
            "status": issue["fields"]["status"]["name"],
            "labels": issue["fields"].get("labels", []),
            "components": [c["name"] for c in issue["fields"].get("components", [])],
            "comments": [
                {"author": c["author"]["displayName"], "body": c["body"], "created": c["created"]}
                for c in comments
            ],
            "attachment_count": len(issue["fields"].get("attachment", [])),
        }

    async def _download_attachments(self, ticket_id: str) -> list[dict]:
        issue = await self._client.get_issue(ticket_id)
        attachments = []
        for att in issue["fields"].get("attachment", []):
            content = await self._client.download_attachment(att["content"])
            attachments.append({
                "filename": att["filename"],
                "mime_type": att["mimeType"],
                "size": att["size"],
                "content": content,
            })
        return attachments

    def shutdown(self) -> None:
        pass  # client cleanup happens via async context; no sync cleanup needed
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_plugins/test_jira.py -v
```

Expected: All 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/devagent/plugins/jira/ backend/tests/test_plugins/test_jira.py
git commit -m "feat: add Jira plugin with async client, ticket reading, and comment posting"
```

---

## Task 4: GitHub Plugin (Client + Plugin)

**Files:**
- Create: `backend/devagent/plugins/github/client.py`
- Create: `backend/devagent/plugins/github/plugin.py`
- Create: `backend/tests/test_plugins/test_github.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_plugins/test_github.py`:

```python
import pytest
import httpx

from devagent.plugins.github.client import AsyncGitHubClient
from devagent.plugins.github.plugin import GitHubPlugin
from devagent.config import GitHubSettings
from devagent.plugins.base import PluginCapability


def make_github_transport():
    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if path == "/user":
            return httpx.Response(200, json={"login": "testuser", "id": 12345})

        if path == "/repos/org/repo/pulls" and request.method == "POST":
            return httpx.Response(201, json={
                "html_url": "https://github.com/org/repo/pull/42",
                "number": 42,
            })

        return httpx.Response(404, json={"message": "Not Found"})

    return httpx.MockTransport(handler)


@pytest.fixture
def github_client():
    client = AsyncGitHubClient(token="fake-token")
    client._client = httpx.AsyncClient(
        base_url="https://api.github.com",
        transport=make_github_transport(),
    )
    return client


@pytest.mark.asyncio
async def test_github_client_get_user(github_client):
    user = await github_client.get_authenticated_user()
    assert user["login"] == "testuser"


@pytest.mark.asyncio
async def test_github_client_create_pr(github_client):
    pr = await github_client.create_pull_request(
        owner="org", repo="repo", title="Test PR", body="Body", head="feat", base="main"
    )
    assert pr["number"] == 42
    assert "pull/42" in pr["html_url"]


def test_github_plugin_capabilities():
    settings = GitHubSettings(enabled=True, token="tok")
    plugin = GitHubPlugin(settings)
    assert PluginCapability.CLONE_REPO in plugin.capabilities
    assert PluginCapability.CREATE_BRANCH in plugin.capabilities
    assert PluginCapability.CREATE_PR in plugin.capabilities


@pytest.mark.asyncio
async def test_github_plugin_health_check(github_client):
    settings = GitHubSettings(enabled=True, token="tok")
    plugin = GitHubPlugin(settings)
    plugin._client = github_client
    health = await plugin.health_check()
    assert health.healthy is True
    assert "testuser" in health.message


@pytest.mark.asyncio
async def test_github_plugin_execute_unknown_action(github_client):
    settings = GitHubSettings(enabled=True, token="tok")
    plugin = GitHubPlugin(settings)
    plugin._client = github_client
    with pytest.raises(ValueError, match="Unknown action"):
        await plugin.execute("delete_repo", {})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_plugins/test_github.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement github/client.py**

Create `backend/devagent/plugins/github/client.py`:

```python
from __future__ import annotations

import asyncio
from pathlib import Path

import httpx


class AsyncGitHubClient:
    def __init__(self, token: str) -> None:
        self._token = token
        self._client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )

    async def get_authenticated_user(self) -> dict:
        r = await self._client.get("/user")
        r.raise_for_status()
        return r.json()

    async def create_pull_request(
        self, owner: str, repo: str, title: str, body: str, head: str, base: str
    ) -> dict:
        r = await self._client.post(
            f"/repos/{owner}/{repo}/pulls",
            json={"title": title, "body": body, "head": head, "base": base},
        )
        r.raise_for_status()
        return r.json()

    async def clone_repo(self, url: str, dest: Path, depth: int = 50) -> None:
        authed_url = url.replace("https://", f"https://x-access-token:{self._token}@")
        proc = await asyncio.create_subprocess_exec(
            "git", "clone", "--depth", str(depth), authed_url, str(dest),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"git clone failed: {stderr.decode().strip()}")

    async def git_checkout_branch(self, repo_path: Path, branch: str) -> None:
        proc = await asyncio.create_subprocess_exec(
            "git", "checkout", "-b", branch,
            cwd=str(repo_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"git checkout failed: {stderr.decode().strip()}")

    async def git_add_commit_push(
        self, repo_path: Path, branch: str, message: str
    ) -> None:
        for cmd in [
            ["git", "add", "-A"],
            ["git", "commit", "-m", message],
            ["git", "push", "origin", branch],
        ]:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(repo_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(f"{cmd[1]} failed: {stderr.decode().strip()}")

    async def close(self) -> None:
        await self._client.aclose()
```

- [ ] **Step 4: Implement github/plugin.py**

Create `backend/devagent/plugins/github/plugin.py`:

```python
from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from devagent.config import GitHubSettings, get_settings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.github.client import AsyncGitHubClient


class GitHubPlugin(BasePlugin):
    name = "github"
    description = "GitHub — clone repos, create branches, push, open PRs"
    capabilities = [
        PluginCapability.CLONE_REPO,
        PluginCapability.CREATE_BRANCH,
        PluginCapability.CREATE_PR,
    ]

    def __init__(self, settings: GitHubSettings) -> None:
        self.settings = settings
        self._client: AsyncGitHubClient | None = None

    async def initialize(self) -> None:
        self._client = AsyncGitHubClient(token=self.settings.token)

    async def health_check(self) -> PluginHealth:
        try:
            user = await self._client.get_authenticated_user()
            return PluginHealth(healthy=True, message=f"Authenticated as {user['login']}")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "clone_repo":
                return await self._clone_repo(params["url"], params.get("depth", 50))
            case "create_branch":
                await self._client.git_checkout_branch(
                    Path(params["repo_path"]), params["branch"]
                )
                return {"branch": params["branch"]}
            case "create_pr":
                return await self._create_pr(params)
            case _:
                raise ValueError(f"Unknown action: {action}")

    async def _clone_repo(self, url: str, depth: int) -> dict:
        workspace = Path(get_settings().workspace_dir)
        workspace.mkdir(parents=True, exist_ok=True)
        repo_dir = workspace / f"repo-{uuid4().hex[:8]}"
        await self._client.clone_repo(url, repo_dir, depth)
        return {"repo_path": str(repo_dir)}

    async def _create_pr(self, params: dict) -> dict:
        repo_path = Path(params["repo_path"])
        branch = params["branch"]

        await self._client.git_add_commit_push(
            repo_path, branch, params.get("title", "DevAgent: automated changes")
        )

        owner, repo = self._extract_owner_repo(params["url"])
        pr = await self._client.create_pull_request(
            owner=owner,
            repo=repo,
            title=params["title"],
            body=params.get("body", ""),
            head=branch,
            base=params.get("base", self.settings.default_base_branch),
        )
        return {"pr_url": pr["html_url"], "pr_number": pr["number"]}

    @staticmethod
    def _extract_owner_repo(url: str) -> tuple[str, str]:
        """Extract owner/repo from a GitHub URL like https://github.com/owner/repo.git"""
        path = url.rstrip("/").removesuffix(".git")
        parts = path.split("/")
        return parts[-2], parts[-1]

    def shutdown(self) -> None:
        pass
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_plugins/test_github.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/devagent/plugins/github/ backend/tests/test_plugins/test_github.py
git commit -m "feat: add GitHub plugin with async client, clone, branch, and PR creation"
```

---

## Task 5: Teams Plugin (Client + Plugin)

**Files:**
- Create: `backend/devagent/plugins/teams/client.py`
- Create: `backend/devagent/plugins/teams/plugin.py`

- [ ] **Step 1: Implement teams/client.py**

Create `backend/devagent/plugins/teams/client.py`:

```python
from __future__ import annotations

import httpx


class AsyncTeamsClient:
    """MS Teams notification client using incoming webhook URLs."""

    def __init__(self, webhook_url: str) -> None:
        self._webhook_url = webhook_url
        self._client = httpx.AsyncClient(timeout=30.0)

    async def send_message(self, text: str) -> dict:
        """Send a message card to the configured Teams channel."""
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [{"type": "TextBlock", "text": text, "wrap": True}],
                    },
                }
            ],
        }
        r = await self._client.post(self._webhook_url, json=payload)
        r.raise_for_status()
        return {"status": "sent"}

    async def ping(self) -> bool:
        """Check if the webhook URL is reachable (HEAD request)."""
        try:
            r = await self._client.head(self._webhook_url)
            return r.status_code < 500
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()
```

- [ ] **Step 2: Implement teams/plugin.py**

Create `backend/devagent/plugins/teams/plugin.py`:

```python
from __future__ import annotations

from devagent.config import TeamsSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.teams.client import AsyncTeamsClient


class TeamsPlugin(BasePlugin):
    name = "teams"
    description = "Microsoft Teams — send notifications via webhook"
    capabilities = [PluginCapability.SEND_NOTIFICATION]

    def __init__(self, settings: TeamsSettings) -> None:
        self.settings = settings
        self._client: AsyncTeamsClient | None = None

    async def initialize(self) -> None:
        if not self.settings.webhook_url:
            raise ValueError("TEAMS_WEBHOOK_URL is required when Teams is enabled")
        self._client = AsyncTeamsClient(webhook_url=self.settings.webhook_url)

    async def health_check(self) -> PluginHealth:
        try:
            reachable = await self._client.ping()
            if reachable:
                return PluginHealth(healthy=True, message="Webhook URL reachable")
            return PluginHealth(healthy=False, message="Webhook URL unreachable")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "send_notification":
                return await self._client.send_message(params["text"])
            case _:
                raise ValueError(f"Unknown action: {action}")

    def shutdown(self) -> None:
        pass
```

- [ ] **Step 3: Commit**

```bash
git add backend/devagent/plugins/teams/
git commit -m "feat: add Teams plugin with webhook notification client"
```

---

## Task 6: Outlook Plugin (Client + Plugin)

**Files:**
- Create: `backend/devagent/plugins/outlook/client.py`
- Create: `backend/devagent/plugins/outlook/plugin.py`

- [ ] **Step 1: Implement outlook/client.py**

Create `backend/devagent/plugins/outlook/client.py`:

```python
from __future__ import annotations

import httpx


class AsyncOutlookClient:
    """MS Graph API client for sending mail via Outlook."""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str) -> None:
        self._tenant_id = tenant_id
        self._client_id = client_id
        self._client_secret = client_secret
        self._client = httpx.AsyncClient(timeout=30.0)
        self._token: str | None = None

    async def _acquire_token(self) -> str:
        """Acquire an OAuth2 client_credentials token from Azure AD."""
        r = await self._client.post(
            f"https://login.microsoftonline.com/{self._tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "scope": "https://graph.microsoft.com/.default",
            },
        )
        r.raise_for_status()
        self._token = r.json()["access_token"]
        return self._token

    async def _ensure_token(self) -> str:
        if self._token is None:
            return await self._acquire_token()
        return self._token

    async def send_mail(
        self, sender: str, to: list[str], subject: str, body: str
    ) -> dict:
        token = await self._ensure_token()
        payload = {
            "message": {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": [
                    {"emailAddress": {"address": addr}} for addr in to
                ],
            },
            "saveToSentItems": "false",
        }
        r = await self._client.post(
            f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        return {"status": "sent"}

    async def ping(self) -> bool:
        """Check if we can acquire a token."""
        try:
            await self._acquire_token()
            return True
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()
```

- [ ] **Step 2: Implement outlook/plugin.py**

Create `backend/devagent/plugins/outlook/plugin.py`:

```python
from __future__ import annotations

from devagent.config import OutlookSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.outlook.client import AsyncOutlookClient


class OutlookPlugin(BasePlugin):
    name = "outlook"
    description = "Microsoft Outlook — send email notifications via MS Graph"
    capabilities = [PluginCapability.SEND_EMAIL]

    def __init__(self, settings: OutlookSettings) -> None:
        self.settings = settings
        self._client: AsyncOutlookClient | None = None

    async def initialize(self) -> None:
        self._client = AsyncOutlookClient(
            tenant_id=self.settings.tenant_id,
            client_id=self.settings.client_id,
            client_secret=self.settings.client_secret,
        )
        # Validate credentials by acquiring a token
        await self._client._acquire_token()

    async def health_check(self) -> PluginHealth:
        try:
            reachable = await self._client.ping()
            if reachable:
                return PluginHealth(healthy=True, message="MS Graph token acquired")
            return PluginHealth(healthy=False, message="Cannot acquire token")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "send_email":
                return await self._client.send_mail(
                    sender=params["sender"],
                    to=params["to"],
                    subject=params["subject"],
                    body=params["body"],
                )
            case _:
                raise ValueError(f"Unknown action: {action}")

    def shutdown(self) -> None:
        pass
```

- [ ] **Step 3: Commit**

```bash
git add backend/devagent/plugins/outlook/
git commit -m "feat: add Outlook plugin with MS Graph email client"
```

---

## Task 7: Wire Registry into FastAPI App + Update Plugins Route

**Files:**
- Modify: `backend/devagent/app.py`
- Modify: `backend/devagent/api/deps.py`
- Modify: `backend/devagent/api/routes/plugins.py`
- Create: `backend/tests/test_plugins/test_api_plugins.py`

- [ ] **Step 1: Write the test**

Create `backend/tests/test_plugins/test_api_plugins.py`:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.registry import PluginRegistry


class FakePlugin(BasePlugin):
    name = "fake"
    description = "Test plugin"
    capabilities = [PluginCapability.READ_TICKETS]

    async def initialize(self) -> None:
        pass

    async def health_check(self) -> PluginHealth:
        return PluginHealth(healthy=True, message="All good")

    async def execute(self, action: str, params: dict) -> dict:
        return {}


@pytest.fixture
async def client_with_plugins():
    """Create a test client with a pre-populated plugin registry."""
    import os

    os.environ.setdefault("APP_SECRET_KEY", "a" * 32)
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

    from devagent.app import create_app

    app = create_app()

    # Inject a fake registry before requests
    registry = PluginRegistry()
    plugin = FakePlugin()
    await registry.register(plugin)
    app.state.plugins = registry

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_plugins_endpoint_returns_health(client_with_plugins):
    resp = await client_with_plugins.get("/api/plugins/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "fake"
    assert data[0]["healthy"] is True
    assert "read_tickets" in data[0]["capabilities"]


@pytest.mark.asyncio
async def test_plugins_endpoint_empty_without_registry(client):
    """The default client fixture has no plugins registered."""
    resp = await client.get("/api/plugins/")
    assert resp.status_code == 200
    assert resp.json() == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_plugins/test_api_plugins.py -v
```

Expected: FAIL — the endpoint returns `[]` because there's no registry wired in.

- [ ] **Step 3: Update api/deps.py**

Replace `backend/devagent/api/deps.py`:

```python
from __future__ import annotations

from fastapi import Request

from devagent.config import AppSettings, get_settings
from devagent.database import get_db as _get_db
from devagent.plugins.registry import PluginRegistry


async def get_db():
    async for session in _get_db():
        yield session


def get_app_settings() -> AppSettings:
    return get_settings()


def get_plugins(request: Request) -> PluginRegistry | None:
    return getattr(request.app.state, "plugins", None)
```

- [ ] **Step 4: Update api/routes/plugins.py**

Replace `backend/devagent/api/routes/plugins.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends

from devagent.api.deps import get_plugins
from devagent.plugins.registry import PluginRegistry

router = APIRouter(tags=["plugins"])


@router.get("/")
async def list_plugins(plugins: PluginRegistry | None = Depends(get_plugins)) -> list:
    if plugins is None:
        return []
    return await plugins.health_check_all()
```

- [ ] **Step 5: Update app.py lifespan to init plugin registry**

Replace `backend/devagent/app.py`:

```python
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
from devagent.database import init_db
from devagent.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)


async def _init_plugins() -> PluginRegistry:
    """Auto-register all enabled plugins based on .env settings."""
    registry = PluginRegistry()

    jira_settings = JiraSettings()
    if jira_settings.enabled:
        from devagent.plugins.jira.plugin import JiraPlugin

        await registry.register(JiraPlugin(jira_settings))

    github_settings = GitHubSettings()
    if github_settings.enabled:
        from devagent.plugins.github.plugin import GitHubPlugin

        await registry.register(GitHubPlugin(github_settings))

    teams_settings = TeamsSettings()
    if teams_settings.enabled:
        from devagent.plugins.teams.plugin import TeamsPlugin

        await registry.register(TeamsPlugin(teams_settings))

    outlook_settings = OutlookSettings()
    if outlook_settings.enabled:
        from devagent.plugins.outlook.plugin import OutlookPlugin

        await registry.register(OutlookPlugin(outlook_settings))

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

    from devagent.api.routes import pipelines, plugins, runs, tasks, ws

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

- [ ] **Step 6: Run ALL tests**

```bash
cd backend && uv run pytest tests/ -v
```

Expected: All tests pass (existing 13 + new plugin tests).

- [ ] **Step 7: Run linter**

```bash
cd backend && uv run ruff check devagent/ tests/ && uv run ruff format --check devagent/ tests/
```

Expected: Clean pass.

- [ ] **Step 8: Commit**

```bash
git add backend/devagent/app.py backend/devagent/api/deps.py backend/devagent/api/routes/plugins.py backend/tests/test_plugins/test_api_plugins.py
git commit -m "feat: wire plugin registry into FastAPI app with live health endpoint"
```

---

## Self-Review

**Spec coverage:**
- [x] BasePlugin ABC with capabilities, health, execute → Task 1
- [x] PluginCapability enum with all 8 values → Task 1
- [x] PluginHealth Pydantic model → Task 1
- [x] PluginNotFoundError → Task 1
- [x] PluginRegistry with register, get, list, health_check_all, shutdown → Task 2
- [x] AsyncJiraClient (httpx) with get_myself, get_issue, get_comments, add_comment, download_attachment → Task 3
- [x] JiraPlugin implementing BasePlugin → Task 3
- [x] AsyncGitHubClient (httpx + asyncio.subprocess for git) → Task 4
- [x] GitHubPlugin implementing BasePlugin → Task 4
- [x] TeamsPlugin with webhook notifications → Task 5
- [x] OutlookPlugin with MS Graph email → Task 6
- [x] Registry auto-init in app lifespan → Task 7
- [x] /api/plugins returns live health from registry → Task 7
- [x] Dependency injection for plugins → Task 7

**Placeholder scan:** No TBD/TODO items. All code blocks are complete.

**Type consistency:**
- `PluginHealth` used consistently in base.py, registry.py, all plugins
- `PluginCapability` enum values consistent across base.py, all plugin definitions, and tests
- `AsyncJiraClient` / `AsyncGitHubClient` / `AsyncTeamsClient` / `AsyncOutlookClient` — naming pattern consistent
- `get_plugins()` in deps.py returns `PluginRegistry | None`, used in plugins.py route
- `health_check_all()` in registry returns `list[dict]` matching what the route returns
