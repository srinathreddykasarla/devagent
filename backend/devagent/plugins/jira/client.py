from __future__ import annotations

import base64
import logging

import httpx

logger = logging.getLogger(__name__)


def adf_to_text(node: dict | str | None) -> str:
    """Recursively extract plain text from Atlassian Document Format (ADF) JSON."""
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        if node.get("type") == "text":
            return node.get("text", "")
        parts = []
        for child in node.get("content", []):
            parts.append(adf_to_text(child))
        block_type = node.get("type", "")
        if block_type in ("paragraph", "heading", "blockquote", "listItem"):
            return "".join(parts) + "\n"
        if block_type in ("bulletList", "orderedList"):
            return "".join(f"- {p.strip()}\n" for p in parts if p.strip())
        if block_type == "codeBlock":
            return "```\n" + "".join(parts) + "```\n"
        return "".join(parts)
    if isinstance(node, list):
        return "".join(adf_to_text(item) for item in node)
    return str(node)


class AsyncJiraClient:
    def __init__(self, base_url: str, email: str, api_token: str) -> None:
        resolved_base = f"{base_url.rstrip('/')}/rest/api/3"
        logger.debug("[JiraClient] Creating client with base_url=%s", resolved_base)
        auth = base64.b64encode(f"{email}:{api_token}".encode()).decode()
        self._client = httpx.AsyncClient(
            base_url=resolved_base,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    async def get_myself(self) -> dict:
        logger.debug("[JiraClient] GET /myself")
        r = await self._client.get("/myself")
        logger.debug("[JiraClient] /myself response: status=%d", r.status_code)
        r.raise_for_status()
        return r.json()

    async def get_issue(self, issue_key: str, expand: str = "") -> dict:
        params = {"expand": expand} if expand else {}
        r = await self._client.get(f"/issue/{issue_key}", params=params)
        r.raise_for_status()
        return r.json()

    async def get_comments(self, issue_key: str) -> list[dict]:
        r = await self._client.get(f"/issue/{issue_key}/comment", params={"orderBy": "created"})
        r.raise_for_status()
        return r.json().get("comments", [])

    async def search_issues(self, jql: str, max_results: int = 50) -> list[dict]:
        """Search issues using JQL. Returns a list of issue dicts."""
        logger.debug("[JiraClient] POST /search/jql with jql=%s", jql)
        r = await self._client.post(
            "/search/jql",
            json={"jql": jql, "maxResults": max_results, "fields": [
                "summary", "description", "issuetype", "priority",
                "status", "labels", "components", "assignee", "created", "updated",
            ]},
        )
        logger.debug("[JiraClient] /search/jql response: status=%d", r.status_code)
        r.raise_for_status()
        return r.json().get("issues", [])

    async def add_comment(self, issue_key: str, body: str) -> dict:
        payload = {
            "body": {
                "version": 1,
                "type": "doc",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": body}]}],
            }
        }
        r = await self._client.post(f"/issue/{issue_key}/comment", json=payload)
        r.raise_for_status()
        return r.json()

    async def download_attachment(self, url: str) -> bytes:
        r = await self._client.get(url)
        r.raise_for_status()
        return r.content

    async def close(self) -> None:
        await self._client.aclose()
