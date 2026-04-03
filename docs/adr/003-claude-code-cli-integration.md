# ADR 003: Claude Code CLI for Code Generation

## Status
Accepted

## Context
DevAgent needs to generate code changes from Jira tickets. We could build a custom tool-use loop with the Anthropic API, or use Claude Code CLI.

## Decision
Shell out to **Claude Code CLI** (`claude --print`) in headless mode rather than building a custom coding agent.

## Rationale
- Claude Code CLI handles file editing, test running, and self-correction out of the box
- No need to implement tool-use loops, permission systems, or file operation safety
- JSON output format provides structured results (cost, turns, session ID)
- CLI manages its own context window and tool selection
- Timeout and max-turns provide resource control

## Consequences
- Claude Code CLI must be installed and authenticated on the host/container
- Less control over the coding process compared to a custom implementation
- Debugging requires checking CLI output rather than internal state
