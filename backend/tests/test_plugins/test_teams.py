import httpx
import pytest

from devagent.config import TeamsSettings
from devagent.plugins.base import PluginCapability
from devagent.plugins.teams.client import AsyncTeamsClient
from devagent.plugins.teams.plugin import TeamsPlugin

WEBHOOK_URL = "https://teams.example.com/webhook/test"


def make_teams_transport():
    """Returns an httpx mock transport that fakes Teams webhook responses."""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/webhook/test":
            if request.method == "POST":
                return httpx.Response(200, json={})
            if request.method == "HEAD":
                return httpx.Response(200)
        return httpx.Response(404, json={"error": "not found"})

    return httpx.MockTransport(handler)


@pytest.fixture
def teams_client():
    client = AsyncTeamsClient(webhook_url=WEBHOOK_URL)
    client._client = httpx.AsyncClient(transport=make_teams_transport())
    return client


@pytest.mark.asyncio
async def test_teams_client_send_message(teams_client):
    result = await teams_client.send_message("Hello from DevAgent")
    assert result["status"] == "sent"


@pytest.mark.asyncio
async def test_teams_client_ping(teams_client):
    assert await teams_client.ping() is True


@pytest.mark.asyncio
async def test_teams_client_ping_server_error():
    """Ping returns False when the webhook URL returns a 500."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    client = AsyncTeamsClient(webhook_url=WEBHOOK_URL)
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    assert await client.ping() is False


def test_teams_plugin_capabilities():
    settings = TeamsSettings(enabled=True, webhook_url=WEBHOOK_URL)
    plugin = TeamsPlugin(settings)
    assert PluginCapability.SEND_NOTIFICATION in plugin.capabilities


@pytest.mark.asyncio
async def test_teams_plugin_initialize_requires_webhook_url():
    settings = TeamsSettings(enabled=True, webhook_url="")
    plugin = TeamsPlugin(settings)
    with pytest.raises(ValueError, match="TEAMS_WEBHOOK_URL"):
        await plugin.initialize()


@pytest.mark.asyncio
async def test_teams_plugin_initialize_sets_client():
    settings = TeamsSettings(enabled=True, webhook_url=WEBHOOK_URL)
    plugin = TeamsPlugin(settings)
    await plugin.initialize()
    assert plugin._client is not None


@pytest.mark.asyncio
async def test_teams_plugin_health_check(teams_client):
    settings = TeamsSettings(enabled=True, webhook_url=WEBHOOK_URL)
    plugin = TeamsPlugin(settings)
    plugin._client = teams_client
    health = await plugin.health_check()
    assert health.healthy is True
    assert "reachable" in health.message.lower()


@pytest.mark.asyncio
async def test_teams_plugin_health_check_unhealthy():
    """Health check reports unhealthy when the webhook is unreachable."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    settings = TeamsSettings(enabled=True, webhook_url=WEBHOOK_URL)
    plugin = TeamsPlugin(settings)
    plugin._client = AsyncTeamsClient(webhook_url=WEBHOOK_URL)
    plugin._client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    health = await plugin.health_check()
    assert health.healthy is False


@pytest.mark.asyncio
async def test_teams_plugin_execute_send_notification(teams_client):
    settings = TeamsSettings(enabled=True, webhook_url=WEBHOOK_URL)
    plugin = TeamsPlugin(settings)
    plugin._client = teams_client
    result = await plugin.execute("send_notification", {"text": "Deploy succeeded"})
    assert result["status"] == "sent"


@pytest.mark.asyncio
async def test_teams_plugin_execute_unknown_action(teams_client):
    settings = TeamsSettings(enabled=True, webhook_url=WEBHOOK_URL)
    plugin = TeamsPlugin(settings)
    plugin._client = teams_client
    with pytest.raises(ValueError, match="Unknown action"):
        await plugin.execute("delete_channel", {})
