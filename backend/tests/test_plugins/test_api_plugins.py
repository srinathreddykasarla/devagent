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
