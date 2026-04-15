from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)


class AsyncGitHubClient:
    def __init__(self, token: str) -> None:
        logger.debug("[GitHubClient] Creating client with token_len=%d", len(token) if token else 0)
        self._token = token
        self._client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )

    async def get_authenticated_user(self) -> dict:
        logger.debug("[GitHubClient] GET /user")
        r = await self._client.get("/user")
        logger.debug("[GitHubClient] /user response: status=%d", r.status_code)
        r.raise_for_status()
        return r.json()

    async def create_pull_request(
        self, owner: str, repo: str, title: str, body: str, head: str, base: str
    ) -> dict:
        r = await self._client.post(
            f"/repos/{owner}/{repo}/pulls",
            json={"title": title, "body": body, "head": head, "base": base},
        )
        r.raise_for_status()
        return r.json()

    async def clone_repo(self, url: str, dest: Path, depth: int = 50) -> None:
        authed_url = url.replace("https://", f"https://x-access-token:{self._token}@")
        proc = await asyncio.create_subprocess_exec(
            "git",
            "clone",
            "--depth",
            str(depth),
            authed_url,
            str(dest),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"git clone failed: {stderr.decode().strip()}")

    async def git_checkout_branch(self, repo_path: Path, branch: str) -> None:
        proc = await asyncio.create_subprocess_exec(
            "git",
            "checkout",
            "-b",
            branch,
            cwd=str(repo_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"git checkout failed: {stderr.decode().strip()}")

    async def git_add_commit_push(self, repo_path: Path, branch: str, message: str) -> None:
        for cmd in [
            ["git", "add", "-A"],
            ["git", "commit", "-m", message],
            ["git", "push", "origin", branch],
        ]:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(repo_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(f"{cmd[1]} failed: {stderr.decode().strip()}")

    async def close(self) -> None:
        await self._client.aclose()
