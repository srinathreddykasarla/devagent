from __future__ import annotations

import logging

from devagent.agents.claude_code import execute_claude_code
from devagent.config import get_settings
from devagent.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)

# Tool names use this separator between plugin/namespace and action.
TOOL_NAME_SEP = "__"

# Namespace for the Claude Code agent tool (not a plugin)
CLAUDE_CODE_NAMESPACE = "claude_code"

CLAUDE_CODE_TOOL_SCHEMA = {
    "description": (
        "Run Claude Code CLI inside a cloned repository to implement code changes. "
        "The prompt should describe what changes to make. Returns the result and cost."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "repo_path": {
                "type": "string",
                "description": "Local repo path returned by github__clone_repo.",
            },
            "prompt": {
                "type": "string",
                "description": "Detailed instructions for Claude Code.",
            },
            "max_turns": {
                "type": "integer",
                "description": "Max conversation turns (default from settings).",
            },
        },
        "required": ["repo_path", "prompt"],
    },
}


class ToolRegistry:
    """Derives Anthropic-compatible tool definitions from registered plugins and agents.

    Each plugin action exposed via TOOL_SCHEMAS becomes an LLM tool named
    `{plugin_name}__{action_name}`. The Claude Code agent is exposed as
    `claude_code__execute`.
    """

    def __init__(self, plugins: PluginRegistry) -> None:
        self._plugins = plugins

    def get_tool_definitions(self) -> list[dict]:
        """Return tool definitions in Anthropic's tool_use format."""
        tools: list[dict] = []

        for plugin in self._plugins._plugins.values():
            schemas: dict[str, dict] = getattr(plugin, "TOOL_SCHEMAS", {}) or {}
            for action, schema in schemas.items():
                tools.append({
                    "name": f"{plugin.name}{TOOL_NAME_SEP}{action}",
                    "description": schema["description"],
                    "input_schema": schema["parameters"],
                })

        # Claude Code agent
        tools.append({
            "name": f"{CLAUDE_CODE_NAMESPACE}{TOOL_NAME_SEP}execute",
            "description": CLAUDE_CODE_TOOL_SCHEMA["description"],
            "input_schema": CLAUDE_CODE_TOOL_SCHEMA["parameters"],
        })

        return tools

    def list_tools(self) -> list[dict]:
        """Return tool info for the GUI (same shape as get_tool_definitions)."""
        return [
            {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            }
            for t in self.get_tool_definitions()
        ]

    async def execute_tool(self, name: str, tool_input: dict) -> dict:
        """Dispatch a tool call to the appropriate plugin or agent."""
        if TOOL_NAME_SEP not in name:
            raise ValueError(f"Invalid tool name '{name}': missing namespace separator")

        namespace, action = name.split(TOOL_NAME_SEP, 1)
        logger.info("Executing tool '%s' with input keys=%s", name, list(tool_input.keys()))

        if namespace == CLAUDE_CODE_NAMESPACE:
            return await self._execute_claude_code(action, tool_input)

        # Plugin dispatch
        plugin = self._plugins.get(namespace)
        result = await plugin.execute(action, tool_input)
        if not isinstance(result, dict):
            # Normalize non-dict results (e.g., lists) so tool_result always sees a dict
            result = {"value": result}
        return result

    async def _execute_claude_code(self, action: str, tool_input: dict) -> dict:
        if action != "execute":
            raise ValueError(f"Unknown claude_code action: {action}")

        settings = get_settings()
        return await execute_claude_code(
            repo_path=tool_input["repo_path"],
            prompt=tool_input["prompt"],
            max_turns=tool_input.get("max_turns", settings.claude_code_max_turns),
            timeout=settings.claude_code_timeout,
            allowed_tools=settings.claude_code_allowed_tools,
            claude_path=settings.claude_code_path,
        )


def build_tool_registry(plugins: PluginRegistry) -> ToolRegistry:
    return ToolRegistry(plugins)


__all__ = ["ToolRegistry", "build_tool_registry", "TOOL_NAME_SEP"]
