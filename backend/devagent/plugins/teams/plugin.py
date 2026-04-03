from __future__ import annotations

from devagent.config import TeamsSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.teams.client import AsyncTeamsClient


class TeamsPlugin(BasePlugin):
    name = "teams"
    description = "Microsoft Teams — send notifications via webhook"
    capabilities = [PluginCapability.SEND_NOTIFICATION]

    def __init__(self, settings: TeamsSettings) -> None:
        self.settings = settings
        self._client: AsyncTeamsClient | None = None

    async def initialize(self) -> None:
        if not self.settings.webhook_url:
            raise ValueError("TEAMS_WEBHOOK_URL is required when Teams is enabled")
        self._client = AsyncTeamsClient(webhook_url=self.settings.webhook_url)

    async def health_check(self) -> PluginHealth:
        try:
            reachable = await self._client.ping()
            if reachable:
                return PluginHealth(healthy=True, message="Webhook URL reachable")
            return PluginHealth(healthy=False, message="Webhook URL unreachable")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "send_notification":
                return await self._client.send_message(params["text"])
            case _:
                raise ValueError(f"Unknown action: {action}")

    def shutdown(self) -> None:
        pass
