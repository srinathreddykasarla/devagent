from __future__ import annotations

import logging
import traceback

from devagent.plugins.base import BasePlugin, PluginNotFoundError

logger = logging.getLogger(__name__)


class PluginRegistry:
    def __init__(self) -> None:
        self._plugins: dict[str, BasePlugin] = {}

    async def register(self, plugin: BasePlugin) -> None:
        """Initialize a plugin and add it to the registry. Logs and skips on failure."""
        logger.debug("[PluginRegistry] Attempting to register plugin '%s'", plugin.name)
        try:
            logger.debug("[PluginRegistry] Calling initialize() for '%s'", plugin.name)
            await plugin.initialize()
            logger.debug("[PluginRegistry] initialize() succeeded for '%s'", plugin.name)

            logger.debug("[PluginRegistry] Calling health_check() for '%s'", plugin.name)
            health = await plugin.health_check()
            logger.debug(
                "[PluginRegistry] health_check() result for '%s': healthy=%s, message=%s",
                plugin.name,
                health.healthy,
                health.message,
            )

            self._plugins[plugin.name] = plugin
            if health.healthy:
                logger.info("Plugin '%s' loaded successfully: %s", plugin.name, health.message)
            else:
                logger.warning(
                    "Plugin '%s' registered but unhealthy: %s", plugin.name, health.message
                )
        except Exception as e:
            logger.error(
                "Plugin '%s' failed to load: %s\n%s",
                plugin.name,
                e,
                traceback.format_exc(),
            )

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
                results.append(
                    {
                        "name": plugin.name,
                        "healthy": health.healthy,
                        "message": health.message,
                        "capabilities": [c.value for c in plugin.capabilities],
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "name": plugin.name,
                        "healthy": False,
                        "message": str(e),
                        "capabilities": [c.value for c in plugin.capabilities],
                    }
                )
        return results

    def shutdown_all(self) -> None:
        for plugin in self._plugins.values():
            try:
                plugin.shutdown()
            except Exception as e:
                logger.warning("Plugin '%s' shutdown error: %s", plugin.name, e)
