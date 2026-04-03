from __future__ import annotations

from devagent.config import OutlookSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.outlook.client import AsyncOutlookClient


class OutlookPlugin(BasePlugin):
    name = "outlook"
    description = "Microsoft Outlook — send email notifications via MS Graph"
    capabilities = [PluginCapability.SEND_EMAIL]

    def __init__(self, settings: OutlookSettings) -> None:
        self.settings = settings
        self._client: AsyncOutlookClient | None = None

    async def initialize(self) -> None:
        self._client = AsyncOutlookClient(
            tenant_id=self.settings.tenant_id,
            client_id=self.settings.client_id,
            client_secret=self.settings.client_secret,
        )
        # Validate credentials by acquiring a token
        await self._client._acquire_token()

    async def health_check(self) -> PluginHealth:
        try:
            reachable = await self._client.ping()
            if reachable:
                return PluginHealth(healthy=True, message="MS Graph token acquired")
            return PluginHealth(healthy=False, message="Cannot acquire token")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "send_email":
                return await self._client.send_mail(
                    sender=params["sender"],
                    to=params["to"],
                    subject=params["subject"],
                    body=params["body"],
                )
            case _:
                raise ValueError(f"Unknown action: {action}")

    def shutdown(self) -> None:
        pass
