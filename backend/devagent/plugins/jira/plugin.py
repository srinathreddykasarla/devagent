from __future__ import annotations

import logging

from devagent.config import JiraSettings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.jira.client import AsyncJiraClient, adf_to_text

logger = logging.getLogger(__name__)


class JiraPlugin(BasePlugin):
    name = "jira"
    description = "Atlassian Jira — read tickets, comments, attachments, post comments"
    capabilities = [PluginCapability.READ_TICKETS, PluginCapability.POST_COMMENT]

    def __init__(self, settings: JiraSettings) -> None:
        self.settings = settings
        self._client: AsyncJiraClient | None = None

    async def initialize(self) -> None:
        logger.debug(
            "[JiraPlugin] Initializing with base_url=%s, email=%s, token_len=%d",
            self.settings.base_url,
            self.settings.email,
            len(self.settings.api_token) if self.settings.api_token else 0,
        )
        if not self.settings.base_url:
            raise ValueError("JIRA_BASE_URL is not set")
        if not self.settings.email:
            raise ValueError("JIRA_EMAIL is not set")
        if not self.settings.api_token:
            raise ValueError("JIRA_API_TOKEN is not set")

        self._client = AsyncJiraClient(
            base_url=self.settings.base_url,
            email=self.settings.email,
            api_token=self.settings.api_token,
        )
        logger.debug("[JiraPlugin] AsyncJiraClient created successfully")

    async def health_check(self) -> PluginHealth:
        try:
            if self._client is None:
                return PluginHealth(healthy=False, message="Client not initialized")
            logger.debug("[JiraPlugin] Running health check — calling /myself")
            user = await self._client.get_myself()
            logger.debug("[JiraPlugin] Health check passed: %s", user.get("displayName"))
            return PluginHealth(healthy=True, message=f"Connected as {user['displayName']}")
        except Exception as e:
            logger.debug("[JiraPlugin] Health check failed: %s", e)
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "read_ticket":
                return await self._read_ticket(params["ticket_id"])
            case "search_tickets":
                return await self._search_tickets(
                    params["project"],
                    params.get("status"),
                    params.get("max_results", 50),
                )
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
            "description": adf_to_text(issue["fields"]["description"]),
            "type": issue["fields"]["issuetype"]["name"],
            "priority": issue["fields"]["priority"]["name"],
            "status": issue["fields"]["status"]["name"],
            "labels": issue["fields"].get("labels", []),
            "components": [c["name"] for c in issue["fields"].get("components", [])],
            "comments": [
                {
                    "author": c["author"]["displayName"],
                    "body": adf_to_text(c["body"]),
                    "created": c["created"],
                }
                for c in comments
            ],
            "attachment_count": len(issue["fields"].get("attachment", [])),
        }

    async def _search_tickets(
        self, project: str, status: str | None = None, max_results: int = 50
    ) -> dict:
        jql_parts = [f"project = {project}"]
        if status:
            jql_parts.append(f"status = \"{status}\"")
        jql = " AND ".join(jql_parts) + " ORDER BY priority DESC, created DESC"
        logger.debug("[JiraPlugin] Searching tickets: %s", jql)

        issues = await self._client.search_issues(jql, max_results)
        tickets = []
        for issue in issues:
            fields = issue["fields"]
            assignee = fields.get("assignee")
            tickets.append({
                "ticket_id": issue["key"],
                "summary": fields["summary"],
                "description": adf_to_text(fields.get("description")),
                "type": fields["issuetype"]["name"],
                "priority": fields["priority"]["name"],
                "status": fields["status"]["name"],
                "labels": fields.get("labels", []),
                "components": [c["name"] for c in fields.get("components", [])],
                "assignee": assignee["displayName"] if assignee else "Unassigned",
            })
        return {"project": project, "ticket_count": len(tickets), "tickets": tickets}

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
