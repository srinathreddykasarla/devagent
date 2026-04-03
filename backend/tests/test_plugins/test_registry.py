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
