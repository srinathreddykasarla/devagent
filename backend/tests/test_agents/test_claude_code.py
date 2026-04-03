import json

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from devagent.agents.claude_code import execute_claude_code


@pytest.mark.asyncio
async def test_execute_claude_code_success():
    mock_result = {
        "result": "Changes applied successfully",
        "cost_usd": 0.05,
        "num_turns": 3,
        "session_id": "sess-123",
    }

    mock_process = AsyncMock()
    mock_process.communicate = AsyncMock(
        return_value=(
            json.dumps(mock_result).encode(),
            b"",
        )
    )
    mock_process.returncode = 0

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        result = await execute_claude_code(
            repo_path="/tmp/test-repo",
            prompt="Fix the bug",
            max_turns=5,
            timeout=60,
        )

    assert result["success"] is True
    assert result["result"] == "Changes applied successfully"
    assert result["cost_usd"] == 0.05
    assert result["turns_used"] == 3
    assert result["session_id"] == "sess-123"


@pytest.mark.asyncio
async def test_execute_claude_code_failure():
    mock_process = AsyncMock()
    mock_process.communicate = AsyncMock(return_value=(b"", b"Error: invalid prompt"))
    mock_process.returncode = 1

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        result = await execute_claude_code(
            repo_path="/tmp/test-repo",
            prompt="Fix the bug",
        )

    assert result["success"] is False
    assert "invalid prompt" in result["error"]
    assert result["exit_code"] == 1


@pytest.mark.asyncio
async def test_execute_claude_code_timeout():
    mock_process = AsyncMock()
    mock_process.kill = MagicMock()

    async def slow_communicate():
        import asyncio as aio

        await aio.sleep(100)
        return b"", b""

    mock_process.communicate = slow_communicate

    with patch("asyncio.create_subprocess_exec", return_value=mock_process):
        result = await execute_claude_code(
            repo_path="/tmp/test-repo",
            prompt="Fix the bug",
            timeout=0,  # immediate timeout
        )

    assert result["success"] is False
    assert "Timed out" in result["error"] or "error" in result


@pytest.mark.asyncio
async def test_execute_claude_code_custom_tools():
    mock_result = {"result": "done"}

    mock_process = AsyncMock()
    mock_process.communicate = AsyncMock(return_value=(json.dumps(mock_result).encode(), b""))
    mock_process.returncode = 0

    with patch("asyncio.create_subprocess_exec", return_value=mock_process) as mock_exec:
        await execute_claude_code(
            repo_path="/tmp/test-repo",
            prompt="Fix",
            allowed_tools=["Bash", "Read"],
        )

    # Verify the command included the custom tools
    call_args = mock_exec.call_args
    cmd_args = call_args[0]
    tools_idx = list(cmd_args).index("--allowedTools")
    assert cmd_args[tools_idx + 1] == "Bash,Read"
