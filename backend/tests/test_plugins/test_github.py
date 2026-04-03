import httpx
import pytest

from devagent.config import GitHubSettings
from devagent.plugins.base import PluginCapability
from devagent.plugins.github.client import AsyncGitHubClient
from devagent.plugins.github.plugin import GitHubPlugin


def make_github_transport():
    """Returns an httpx mock transport that fakes GitHub REST API responses."""

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path

        if path == "/user":
            return httpx.Response(200, json={"login": "testuser", "id": 12345})

        if path == "/repos/org/repo/pulls" and request.method == "POST":
            return httpx.Response(
                201,
                json={
                    "html_url": "https://github.com/org/repo/pull/42",
                    "number": 42,
                },
            )

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


def test_github_plugin_extract_owner_repo():
    assert GitHubPlugin._extract_owner_repo("https://github.com/org/repo.git") == ("org", "repo")
    assert GitHubPlugin._extract_owner_repo("https://github.com/org/repo") == ("org", "repo")
    assert GitHubPlugin._extract_owner_repo("https://github.com/org/repo/") == ("org", "repo")
