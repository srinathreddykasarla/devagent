from __future__ import annotations

import asyncio
import json
import logging

logger = logging.getLogger(__name__)


async def execute_claude_code(
    repo_path: str,
    prompt: str,
    max_turns: int = 30,
    timeout: int = 600,
    allowed_tools: list[str] | None = None,
    claude_path: str = "claude",
    log_callback: callable | None = None,
) -> dict:
    """
    Invoke Claude Code CLI in headless (--print) mode.
    Runs inside the cloned repo directory.
    Returns structured result with success status, output, cost, and turns used.
    """
    tools = allowed_tools or ["Bash", "Read", "Write", "Edit", "MultiEdit", "Glob", "Grep"]

    cmd = [
        claude_path,
        "--print",
        "--output-format",
        "json",
        "--max-turns",
        str(max_turns),
        "--allowedTools",
        ",".join(tools),
        "-p",
        prompt,
    ]

    logger.info(
        "Executing Claude Code in %s (max_turns=%d, timeout=%ds)", repo_path, max_turns, timeout
    )

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=repo_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)

        if process.returncode != 0:
            error_msg = stderr.decode().strip()
            logger.error("Claude Code failed (exit %d): %s", process.returncode, error_msg)
            return {
                "success": False,
                "error": error_msg,
                "exit_code": process.returncode,
            }

        result = json.loads(stdout.decode())
        logger.info("Claude Code completed successfully")
        return {
            "success": True,
            "result": result.get("result", ""),
            "cost_usd": result.get("cost_usd"),
            "turns_used": result.get("num_turns"),
            "session_id": result.get("session_id"),
        }

    except TimeoutError:
        process.kill()
        logger.error("Claude Code timed out after %ds", timeout)
        return {"success": False, "error": f"Timed out after {timeout}s"}
    except Exception as e:
        logger.error("Claude Code error: %s", e)
        return {"success": False, "error": str(e)}
