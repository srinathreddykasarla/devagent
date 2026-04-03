import httpx
import pytest

from devagent.config import OutlookSettings
from devagent.plugins.base import PluginCapability
from devagent.plugins.outlook.client import AsyncOutlookClient
from devagent.plugins.outlook.plugin import OutlookPlugin

TENANT_ID = "fake-tenant-id"
CLIENT_ID = "fake-client-id"
CLIENT_SECRET = "fake-client-secret"


def make_outlook_transport():
    """Returns an httpx mock transport that fakes Azure AD and MS Graph responses."""

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        # Azure AD token endpoint
        if path == f"/{TENANT_ID}/oauth2/v2.0/token":
            return httpx.Response(200, json={"access_token": "fake-token-123"})

        # MS Graph sendMail endpoint
        if path.startswith("/v1.0/users/") and path.endswith("/sendMail"):
            auth = request.headers.get("Authorization", "")
            if auth == "Bearer fake-token-123":
                return httpx.Response(202)
            return httpx.Response(401, json={"error": "unauthorized"})

        return httpx.Response(404, json={"error": "not found"})

    return httpx.MockTransport(handler)


@pytest.fixture
def outlook_client():
    transport = make_outlook_transport()
    client = AsyncOutlookClient(
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    client._client = httpx.AsyncClient(transport=transport)
    return client


@pytest.mark.asyncio
async def test_outlook_client_acquire_token(outlook_client):
    token = await outlook_client._acquire_token()
    assert token == "fake-token-123"
    assert outlook_client._token == "fake-token-123"


@pytest.mark.asyncio
async def test_outlook_client_ensure_token_acquires_when_none(outlook_client):
    assert outlook_client._token is None
    token = await outlook_client._ensure_token()
    assert token == "fake-token-123"


@pytest.mark.asyncio
async def test_outlook_client_ensure_token_returns_cached(outlook_client):
    outlook_client._token = "cached-token"
    token = await outlook_client._ensure_token()
    assert token == "cached-token"


@pytest.mark.asyncio
async def test_outlook_client_send_mail(outlook_client):
    result = await outlook_client.send_mail(
        sender="sender@example.com",
        to=["recipient@example.com"],
        subject="Test Subject",
        body="Test body content",
    )
    assert result["status"] == "sent"


@pytest.mark.asyncio
async def test_outlook_client_ping(outlook_client):
    assert await outlook_client.ping() is True


@pytest.mark.asyncio
async def test_outlook_client_ping_failure():
    """Ping returns False when token acquisition fails."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_client"})

    client = AsyncOutlookClient(
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret="bad-secret",
    )
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    assert await client.ping() is False


def test_outlook_plugin_capabilities():
    settings = OutlookSettings(
        enabled=True,
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    plugin = OutlookPlugin(settings)
    assert PluginCapability.SEND_EMAIL in plugin.capabilities


@pytest.mark.asyncio
async def test_outlook_plugin_health_check(outlook_client):
    settings = OutlookSettings(
        enabled=True,
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    plugin = OutlookPlugin(settings)
    plugin._client = outlook_client
    health = await plugin.health_check()
    assert health.healthy is True
    assert "token" in health.message.lower()


@pytest.mark.asyncio
async def test_outlook_plugin_health_check_unhealthy():
    """Health check reports unhealthy when token acquisition fails."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_client"})

    settings = OutlookSettings(
        enabled=True,
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    plugin = OutlookPlugin(settings)
    plugin._client = AsyncOutlookClient(
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    plugin._client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    health = await plugin.health_check()
    assert health.healthy is False


@pytest.mark.asyncio
async def test_outlook_plugin_execute_send_email(outlook_client):
    settings = OutlookSettings(
        enabled=True,
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    plugin = OutlookPlugin(settings)
    plugin._client = outlook_client
    result = await plugin.execute(
        "send_email",
        {
            "sender": "sender@example.com",
            "to": ["recipient@example.com"],
            "subject": "Test",
            "body": "Hello",
        },
    )
    assert result["status"] == "sent"


@pytest.mark.asyncio
async def test_outlook_plugin_execute_unknown_action(outlook_client):
    settings = OutlookSettings(
        enabled=True,
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    plugin = OutlookPlugin(settings)
    plugin._client = outlook_client
    with pytest.raises(ValueError, match="Unknown action"):
        await plugin.execute("read_inbox", {})
