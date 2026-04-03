import httpx
import pytest

from devagent.config import JiraSettings
from devagent.plugins.base import PluginCapability
from devagent.plugins.jira.client import AsyncJiraClient
from devagent.plugins.jira.plugin import JiraPlugin


def make_jira_transport():
    """Returns an httpx mock transport that fakes Jira REST API v3 responses."""

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if path == "/rest/api/3/myself":
            return httpx.Response(200, json={"displayName": "Test User", "accountId": "abc123"})

        if path.startswith("/rest/api/3/issue/") and path.endswith("/comment"):
            if request.method == "GET":
                return httpx.Response(
                    200,
                    json={
                        "comments": [
                            {
                                "author": {"displayName": "Alice"},
                                "body": "A comment",
                                "created": "2026-01-01T00:00:00Z",
                            }
                        ]
                    },
                )
            if request.method == "POST":
                return httpx.Response(201, json={"id": "10001"})

        if path.startswith("/rest/api/3/issue/"):
            return httpx.Response(
                200,
                json={
                    "fields": {
                        "summary": "Fix the login bug",
                        "description": "Users cannot log in",
                        "issuetype": {"name": "Bug"},
                        "priority": {"name": "High"},
                        "status": {"name": "To Do"},
                        "labels": ["backend"],
                        "components": [{"name": "auth"}],
                        "attachment": [
                            {
                                "filename": "screenshot.png",
                                "mimeType": "image/png",
                                "size": 1024,
                                "content": "https://jira.example.com/attachment/1",
                            }
                        ],
                    }
                },
            )

        return httpx.Response(404, json={"error": "not found"})

    return httpx.MockTransport(handler)


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
    settings = JiraSettings(
        enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok"
    )
    plugin = JiraPlugin(settings)
    assert PluginCapability.READ_TICKETS in plugin.capabilities
    assert PluginCapability.POST_COMMENT in plugin.capabilities


@pytest.mark.asyncio
async def test_jira_plugin_health_check(jira_client):
    settings = JiraSettings(
        enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok"
    )
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    health = await plugin.health_check()
    assert health.healthy is True
    assert "Test User" in health.message


@pytest.mark.asyncio
async def test_jira_plugin_execute_read_ticket(jira_client):
    settings = JiraSettings(
        enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok"
    )
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    result = await plugin.execute("read_ticket", {"ticket_id": "TEST-1"})
    assert result["ticket_id"] == "TEST-1"
    assert result["summary"] == "Fix the login bug"
    assert len(result["comments"]) == 1


@pytest.mark.asyncio
async def test_jira_plugin_execute_post_comment(jira_client):
    settings = JiraSettings(
        enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok"
    )
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    result = await plugin.execute("post_comment", {"ticket_id": "TEST-1", "body": "Hello"})
    assert result["id"] == "10001"


@pytest.mark.asyncio
async def test_jira_plugin_execute_unknown_action(jira_client):
    settings = JiraSettings(
        enabled=True, base_url="https://test.atlassian.net", email="t@t.com", api_token="tok"
    )
    plugin = JiraPlugin(settings)
    plugin._client = jira_client
    with pytest.raises(ValueError, match="Unknown action"):
        await plugin.execute("delete_ticket", {})
