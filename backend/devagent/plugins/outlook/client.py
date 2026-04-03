from __future__ import annotations

import httpx


class AsyncOutlookClient:
    """MS Graph API client for sending mail via Outlook."""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str) -> None:
        self._tenant_id = tenant_id
        self._client_id = client_id
        self._client_secret = client_secret
        self._client = httpx.AsyncClient(timeout=30.0)
        self._token: str | None = None

    async def _acquire_token(self) -> str:
        """Acquire an OAuth2 client_credentials token from Azure AD."""
        r = await self._client.post(
            f"https://login.microsoftonline.com/{self._tenant_id}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "scope": "https://graph.microsoft.com/.default",
            },
        )
        r.raise_for_status()
        self._token = r.json()["access_token"]
        return self._token

    async def _ensure_token(self) -> str:
        if self._token is None:
            return await self._acquire_token()
        return self._token

    async def send_mail(self, sender: str, to: list[str], subject: str, body: str) -> dict:
        token = await self._ensure_token()
        payload = {
            "message": {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": [{"emailAddress": {"address": addr}} for addr in to],
            },
            "saveToSentItems": "false",
        }
        r = await self._client.post(
            f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        return {"status": "sent"}

    async def ping(self) -> bool:
        """Check if we can acquire a token."""
        try:
            await self._acquire_token()
            return True
        except Exception:
            return False

    async def close(self) -> None:
        await self._client.aclose()
