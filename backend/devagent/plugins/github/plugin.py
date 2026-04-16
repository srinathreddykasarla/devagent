from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from devagent.config import GitHubSettings, get_settings
from devagent.plugins.base import BasePlugin, PluginCapability, PluginHealth
from devagent.plugins.github.client import AsyncGitHubClient

logger = logging.getLogger(__name__)


class GitHubPlugin(BasePlugin):
    name = "github"
    description = "GitHub — clone repos, create branches, push, open PRs"
    capabilities = [
        PluginCapability.CLONE_REPO,
        PluginCapability.CREATE_BRANCH,
        PluginCapability.CREATE_PR,
    ]

    TOOL_SCHEMAS = {
        "clone_repo": {
            "description": (
                "Clone a GitHub repository to the workspace. Returns a repo_path "
                "that must be used for subsequent branch and PR operations."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "GitHub repo URL, e.g. 'https://github.com/owner/repo'.",
                    },
                    "depth": {
                        "type": "integer",
                        "description": "Git clone depth (default 50).",
                        "default": 50,
                    },
                },
                "required": ["url"],
            },
        },
        "create_branch": {
            "description": "Create a new branch in a cloned repository.",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo_path": {
                        "type": "string",
                        "description": "Local repo path returned by clone_repo.",
                    },
                    "branch": {
                        "type": "string",
                        "description": "Branch name, e.g. 'fix/scrum-1-add-auth'.",
                    },
                },
                "required": ["repo_path", "branch"],
            },
        },
        "create_pr": {
            "description": (
                "Commit all changes, push the branch, and open a pull request. "
                "Returns {pr_url, pr_number}."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "repo_path": {
                        "type": "string",
                        "description": "Local repo path.",
                    },
                    "url": {
                        "type": "string",
                        "description": "GitHub repo URL (used to extract owner/repo).",
                    },
                    "branch": {
                        "type": "string",
                        "description": "Branch name to push and open PR from.",
                    },
                    "title": {
                        "type": "string",
                        "description": "Pull request title.",
                    },
                    "body": {
                        "type": "string",
                        "description": "Pull request description.",
                    },
                    "base": {
                        "type": "string",
                        "description": "Target base branch (default 'main').",
                        "default": "main",
                    },
                },
                "required": ["repo_path", "url", "branch", "title"],
            },
        },
    }

    def __init__(self, settings: GitHubSettings) -> None:
        self.settings = settings
        self._client: AsyncGitHubClient | None = None

    async def initialize(self) -> None:
        logger.debug(
            "[GitHubPlugin] Initializing with org=%s, token_len=%d",
            self.settings.default_org,
            len(self.settings.token) if self.settings.token else 0,
        )
        if not self.settings.token:
            raise ValueError("GITHUB_TOKEN is not set")

        self._client = AsyncGitHubClient(token=self.settings.token)
        logger.debug("[GitHubPlugin] AsyncGitHubClient created successfully")

    async def health_check(self) -> PluginHealth:
        try:
            if self._client is None:
                return PluginHealth(healthy=False, message="Client not initialized")
            logger.debug("[GitHubPlugin] Running health check — calling /user")
            user = await self._client.get_authenticated_user()
            logger.debug("[GitHubPlugin] Health check passed: %s", user.get("login"))
            return PluginHealth(healthy=True, message=f"Authenticated as {user['login']}")
        except Exception as e:
            logger.debug("[GitHubPlugin] Health check failed: %s", e)
            return PluginHealth(healthy=False, message=str(e))

    async def execute(self, action: str, params: dict) -> dict:
        match action:
            case "clone_repo":
                return await self._clone_repo(params["url"], params.get("depth", 50))
            case "create_branch":
                await self._client.git_checkout_branch(Path(params["repo_path"]), params["branch"])
                return {"branch": params["branch"]}
            case "create_pr":
                return await self._create_pr(params)
            case _:
                raise ValueError(f"Unknown action: {action}")

    async def _clone_repo(self, url: str, depth: int) -> dict:
        workspace = Path(get_settings().workspace_dir)
        workspace.mkdir(parents=True, exist_ok=True)
        repo_dir = workspace / f"repo-{uuid4().hex[:8]}"
        await self._client.clone_repo(url, repo_dir, depth)
        return {"repo_path": str(repo_dir)}

    async def _create_pr(self, params: dict) -> dict:
        repo_path = Path(params["repo_path"])
        branch = params["branch"]

        await self._client.git_add_commit_push(
            repo_path, branch, params.get("title", "DevAgent: automated changes")
        )

        owner, repo = self._extract_owner_repo(params["url"])
        pr = await self._client.create_pull_request(
            owner=owner,
            repo=repo,
            title=params["title"],
            body=params.get("body", ""),
            head=branch,
            base=params.get("base", self.settings.default_base_branch),
        )
        return {"pr_url": pr["html_url"], "pr_number": pr["number"]}

    @staticmethod
    def _extract_owner_repo(url: str) -> tuple[str, str]:
        """Extract owner/repo from a GitHub URL like https://github.com/owner/repo.git"""
        path = url.rstrip("/").removesuffix(".git")
        parts = path.split("/")
        return parts[-2], parts[-1]

    def shutdown(self) -> None:
        pass
