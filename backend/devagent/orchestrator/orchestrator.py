from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import anthropic

from devagent.orchestrator.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

LogCallback = Callable[[str, str], Awaitable[None]]


def _safe_json(obj: Any) -> str:
    """Serialize a value to JSON, falling back to repr if non-serializable."""
    try:
        return json.dumps(obj, default=str)
    except Exception:
        return repr(obj)


async def run_orchestrator(
    system_prompt: str,
    user_message: str,
    tool_registry: ToolRegistry,
    api_key: str,
    model: str,
    log_callback: LogCallback | None = None,
    max_iterations: int = 20,
    max_tokens: int = 4096,
) -> dict[str, Any]:
    """Run an Anthropic tool_use agent loop.

    The LLM is given the system prompt, the user message, and the tool definitions.
    It may call tools iteratively; each tool call is dispatched via the ToolRegistry.
    Loop terminates when the model returns `end_turn` or max_iterations is hit.

    Returns:
        {
            "result": final assistant text,
            "tool_calls": list of {"name", "input", "output"} records,
            "iterations": int,
            "stop_reason": str,
        }
    """
    if not api_key:
        raise ValueError("Anthropic API key is required to run the orchestrator")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    tools = tool_registry.get_tool_definitions()
    messages: list[dict] = [{"role": "user", "content": user_message}]
    tool_calls_record: list[dict] = []
    stop_reason = "unknown"
    final_text = ""

    async def log(msg: str, level: str = "info") -> None:
        if log_callback is not None:
            await log_callback(msg, level)
        else:
            logger.log(getattr(logging, level.upper(), logging.INFO), msg)

    await log(f"Orchestrator starting with {len(tools)} tools available")

    for iteration in range(1, max_iterations + 1):
        await log(f"Orchestrator iteration {iteration}")

        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            tools=tools,
            messages=messages,
        )

        stop_reason = response.stop_reason or "unknown"

        # Collect any assistant text for reporting
        assistant_texts = [
            block.text for block in response.content if block.type == "text"
        ]
        if assistant_texts:
            final_text = "\n".join(assistant_texts)

        if stop_reason == "end_turn":
            await log("Orchestrator completed (end_turn)")
            return {
                "result": final_text,
                "tool_calls": tool_calls_record,
                "iterations": iteration,
                "stop_reason": stop_reason,
            }

        if stop_reason != "tool_use":
            await log(f"Orchestrator stopped with reason '{stop_reason}'", level="warning")
            return {
                "result": final_text,
                "tool_calls": tool_calls_record,
                "iterations": iteration,
                "stop_reason": stop_reason,
            }

        # Append the assistant message (required by Anthropic tool_use protocol)
        messages.append({"role": "assistant", "content": response.content})

        # Execute each tool call and build tool_result blocks
        tool_result_blocks: list[dict] = []
        for block in response.content:
            if block.type != "tool_use":
                continue

            tool_name = block.name
            tool_input = block.input if isinstance(block.input, dict) else {}
            await log(f"Calling tool '{tool_name}' with input={_safe_json(tool_input)}")

            try:
                output = await tool_registry.execute_tool(tool_name, tool_input)
                tool_result_blocks.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": _safe_json(output),
                })
                tool_calls_record.append({
                    "name": tool_name,
                    "input": tool_input,
                    "output": output,
                })
                await log(f"Tool '{tool_name}' succeeded")
            except Exception as e:
                err = f"Tool '{tool_name}' failed: {e}"
                await log(err, level="error")
                tool_result_blocks.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": err,
                    "is_error": True,
                })
                tool_calls_record.append({
                    "name": tool_name,
                    "input": tool_input,
                    "output": None,
                    "error": str(e),
                })

        messages.append({"role": "user", "content": tool_result_blocks})

    await log(
        f"Orchestrator hit max_iterations={max_iterations} without completing",
        level="warning",
    )
    return {
        "result": final_text,
        "tool_calls": tool_calls_record,
        "iterations": max_iterations,
        "stop_reason": "max_iterations",
    }


__all__ = ["run_orchestrator", "LogCallback"]
