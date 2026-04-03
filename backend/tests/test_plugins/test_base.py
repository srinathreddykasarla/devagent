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
