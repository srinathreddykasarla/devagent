from __future__ import annotations

from abc import ABC, abstractmethod
from enum import StrEnum

from pydantic import BaseModel


class PluginCapability(StrEnum):
    READ_TICKETS = "read_tickets"
    POST_COMMENT = "post_comment"
    CREATE_PR = "create_pr"
    CLONE_REPO = "clone_repo"
    CREATE_BRANCH = "create_branch"
    SEND_NOTIFICATION = "send_notification"
    SEND_EMAIL = "send_email"
    WEBHOOK_TRIGGER = "webhook_trigger"


class PluginHealth(BaseModel):
    healthy: bool
    message: str


class PluginNotFoundError(Exception):
    pass


class BasePlugin(ABC):
    name: str
    description: str
    capabilities: list[PluginCapability]

    # Optional: map action names to Anthropic-compatible tool schemas.
    # Each entry: {"description": str, "parameters": JSON Schema dict}
    # Used by the orchestrator's ToolRegistry to expose plugin actions as LLM tools.
    TOOL_SCHEMAS: dict[str, dict] = {}

    @abstractmethod
    async def initialize(self) -> None:
        """Called once when plugin is loaded. Set up HTTP clients, validate creds."""

    @abstractmethod
    async def health_check(self) -> PluginHealth:
        """Verify credentials and connectivity."""

    @abstractmethod
    async def execute(self, action: str, params: dict) -> dict:
        """Execute a capability action."""

    def shutdown(self) -> None:
        """Optional cleanup on app shutdown."""
