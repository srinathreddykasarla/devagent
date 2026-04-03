from __future__ import annotations

from devagent.config import JiraSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.jira.client import AsyncJiraClient


class JiraPlugin(BasePlugin):
    name = "jira"
    description = "Atlassian Jira — read tickets, comments, attachments, post comments"
    capabilities = [PluginCapability.READ_TICKETS, PluginCapability.POST_COMMENT]

    def __init__(self, settings: JiraSettings) -> None:
        self.settings = settings
        self._client: AsyncJiraClient | None = None

    async def initialize(self) -> None:
        self._client = AsyncJiraClient(
            base_url=self.settings.base_url,
            email=self.settings.email,
            api_token=self.settings.api_token,
        )

    async def health_check(self) -> PluginHealth:
        try:
            user = await self._client.get_myself()
            return PluginHealth(healthy=True, message=f"Connected as {user['displayName']}")
        except Exception as e:
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "read_ticket":
                return await self._read_ticket(params["ticket_id"])
            case "post_comment":
                return await self._client.add_comment(params["ticket_id"], params["body"])
            case "download_attachments":
                return await self._download_attachments(params["ticket_id"])
            case _:
                raise ValueError(f"Unknown action: {action}")

    async def _read_ticket(self, ticket_id: str) -> dict:
        issue = await self._client.get_issue(ticket_id, expand="renderedFields")
        comments = await self._client.get_comments(ticket_id)
        return {
            "ticket_id": ticket_id,
            "summary": issue["fields"]["summary"],
            "description": issue["fields"]["description"],
            "type": issue["fields"]["issuetype"]["name"],
            "priority": issue["fields"]["priority"]["name"],
            "status": issue["fields"]["status"]["name"],
            "labels": issue["fields"].get("labels", []),
            "components": [c["name"] for c in issue["fields"].get("components", [])],
            "comments": [
                {
                    "author": c["author"]["displayName"],
                    "body": c["body"],
                    "created": c["created"],
                }
                for c in comments
            ],
            "attachment_count": len(issue["fields"].get("attachment", [])),
        }

    async def _download_attachments(self, ticket_id: str) -> list[dict]:
        issue = await self._client.get_issue(ticket_id)
        attachments = []
        for att in issue["fields"].get("attachment", []):
            content = await self._client.download_attachment(att["content"])
            attachments.append(
                {
                    "filename": att["filename"],
                    "mime_type": att["mimeType"],
                    "size": att["size"],
                    "content": content,
                }
            )
        return attachments

    def shutdown(self) -> None:
        pass
