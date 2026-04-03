import pytest

from devagent.pipelines.jira_to_pr import JiraToPRPipeline, build_jira_to_pr_graph
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.registry import PluginRegistry


class FakeJiraPlugin(BasePlugin):
    name = "jira"
    description = "Fake Jira"
    capabilities = [PluginCapability.READ_TICKETS, PluginCapability.POST_COMMENT]

    async def initialize(self):
        pass

    async def health_check(self):
        return PluginHealth(healthy=True, message="ok")

    async def execute(self, action, params):
        if action == "read_ticket":
            return {
                "ticket_id": params["ticket_id"],
                "summary": "Fix login bug",
                "description": "A" * 100 + " https://github.com/org/repo",
                "type": "Bug",
                "priority": "High",
                "status": "To Do",
                "labels": ["backend"],
                "components": [{"name": "auth"}],
                "comments": [],
                "attachment_count": 0,
            }
        if action == "post_comment":
            return {"id": "comment-1"}
        return {}


class FakeGitHubPlugin(BasePlugin):
    name = "github"
    description = "Fake GitHub"
    capabilities = [
        PluginCapability.CLONE_REPO,
        PluginCapability.CREATE_BRANCH,
        PluginCapability.CREATE_PR,
    ]

    async def initialize(self):
        pass

    async def health_check(self):
        return PluginHealth(healthy=True, message="ok")

    async def execute(self, action, params):
        if action == "clone_repo":
            return {"repo_path": "/tmp/test-repo"}
        if action == "create_branch":
            return {"branch": params["branch"]}
        if action == "create_pr":
            return {"pr_url": "https://github.com/org/repo/pull/1", "pr_number": 1}
        return {}


@pytest.fixture
async def fake_registry():
    registry = PluginRegistry()
    await registry.register(FakeJiraPlugin())
    await registry.register(FakeGitHubPlugin())
    return registry


def test_jira_to_pr_pipeline_name(fake_registry):
    pipeline = JiraToPRPipeline(fake_registry)
    assert pipeline.name == "jira_to_pr"


def test_build_graph_creates_state_graph(fake_registry):
    graph = build_jira_to_pr_graph(fake_registry)
    assert graph is not None
