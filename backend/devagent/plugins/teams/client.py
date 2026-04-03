from __future__ import annotations

import httpx


class AsyncTeamsClient:
    """MS Teams notification client using incoming webhook URLs."""

    def __init__(self, webhook_url: str) -> None:
        self._webhook_url = webhook_url
        self._client = httpx.AsyncClient(timeout=30.0)

    async def send_message(self, text: str) -> dict:
        """Send a message card to the configured Teams channel."""
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [{"type": "TextBlock", "text": text, "wrap": True}],
                    },
                }
            ],
        }
        r = await self._client.post(self._webhook_url, json=payload)
        r.raise_for_status()
        return {"status": "sent"}

    async def ping(self) -> bool:
        """Check if the webhook URL is reachable (HEAD request)."""
        try:
            r = await self._client.head(self._webhook_url)
            return r.status_code < 500
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()
