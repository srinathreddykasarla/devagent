from __future__ import annotations

import base64

import httpx


class AsyncJiraClient:
    def __init__(self, base_url: str, email: str, api_token: str) -> None:
        auth = base64.b64encode(f"{email}:{api_token}".encode()).decode()
        self._client = httpx.AsyncClient(
            base_url=f"{base_url.rstrip('/')}/rest/api/3",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    async def get_myself(self) -> dict:
        r = await self._client.get("/myself")
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
