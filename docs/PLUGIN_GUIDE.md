# Plugin Development Guide

## Overview

DevAgent uses a plugin architecture for all external integrations. Each plugin implements the `BasePlugin` abstract base class and provides specific capabilities.

## Creating a New Plugin

### 1. Define Settings

Add a settings class to `backend/devagent/config.py`:

```python
class MyServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="MYSERVICE_", extra="ignore")
    enabled: bool = False
    api_key: str = ""
    base_url: str = ""
```

Add the corresponding environment variables to `.env.example`:

```bash
MYSERVICE_ENABLED=false
MYSERVICE_API_KEY=your-api-key
MYSERVICE_BASE_URL=https://api.myservice.com
```

### 2. Create the Client

Create `backend/devagent/plugins/myservice/client.py`:

```python
import httpx

class AsyncMyServiceClient:
    def __init__(self, api_key: str, base_url: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )

    async def some_operation(self, param: str) -> dict:
        r = await self._client.get(f"/endpoint/{param}")
        r.raise_for_status()
        return r.json()

    async def close(self) -> None:
        await self._client.aclose()
```

### 3. Create the Plugin

Create `backend/devagent/plugins/myservice/plugin.py`:

```python
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.myservice.client import AsyncMyServiceClient

class MyServicePlugin(BasePlugin):
    name = "myservice"
    description = "My Service integration"
    capabilities = [PluginCapability.READ_TICKETS]  # choose applicable capabilities

    def __init__(self, settings):
        self.settings = settings
        self._client = None

    async def initialize(self) -> None:
        self._client = AsyncMyServiceClient(
            api_key=self.settings.api_key,
            base_url=self.settings.base_url,
        )

    async def health_check(self) -> PluginHealth:
        try:
            # Test connectivity
            await self._client.some_operation("test")
            return PluginHealth(healthy=True, message="Connected")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "some_action":
                return await self._client.some_operation(params["id"])
            case _:
                raise ValueError(f"Unknown action: {action}")
```

### 4. Register the Plugin

In `backend/devagent/app.py`, add to the `_init_plugins()` function:

```python
myservice_settings = MyServiceSettings()
if myservice_settings.enabled:
    from devagent.plugins.myservice.plugin import MyServicePlugin
    await registry.register(MyServicePlugin(myservice_settings))
```

### 5. Write Tests

Create `backend/tests/test_plugins/test_myservice.py` using `httpx.MockTransport`:

```python
import httpx
import pytest

def make_mock_transport():
    def handler(request):
        return httpx.Response(200, json={"status": "ok"})
    return httpx.MockTransport(handler)

@pytest.fixture
def client():
    from devagent.plugins.myservice.client import AsyncMyServiceClient
    c = AsyncMyServiceClient(api_key="test", base_url="https://test.com")
    c._client = httpx.AsyncClient(base_url="https://test.com", transport=make_mock_transport())
    return c
```

## Available Capabilities

| Capability | Description |
|-----------|-------------|
| `READ_TICKETS` | Read ticket/issue data |
| `POST_COMMENT` | Post comments to tickets |
| `CREATE_PR` | Create pull requests |
| `CLONE_REPO` | Clone git repositories |
| `CREATE_BRANCH` | Create git branches |
| `SEND_NOTIFICATION` | Send notifications (chat, webhook) |
| `SEND_EMAIL` | Send emails |
| `WEBHOOK_TRIGGER` | Trigger via webhook |

## Conventions

- Use `httpx.AsyncClient` for all HTTP calls (async)
- Use `asyncio.create_subprocess_exec` for shell commands (not subprocess.run)
- Settings always come from Pydantic Settings with `env_prefix`
- Health checks should be fast and non-destructive
- Handle errors gracefully — return `PluginHealth(healthy=False, ...)` instead of raising
