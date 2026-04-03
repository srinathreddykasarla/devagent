from __future__ import annotations

import logging
import re
from pathlib import Path

from slugify import slugify

logger = logging.getLogger(__name__)


async def assess_context_sufficiency(
    ticket_context: dict, anthropic_api_key: str | None, model: str
) -> bool:
    """Use LLM to assess if a Jira ticket has enough context to code against.
    Returns True if sufficient, False if more info needed.
    Falls back to heuristic if no API key configured."""
    if not anthropic_api_key:
        return _heuristic_sufficiency(ticket_context)

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
        prompt = (
            "Analyze this Jira ticket and determine if it has enough context for a developer "
            "to implement a code change. Consider: Is the problem clearly described? "
            "Are acceptance criteria present? Is the affected code area identifiable?\n\n"
            f"Summary: {ticket_context.get('summary', '')}\n"
            f"Description: {ticket_context.get('description', '')}\n"
            f"Type: {ticket_context.get('type', '')}\n"
            f"Comments: {len(ticket_context.get('comments', []))}\n"
            f"Labels: {ticket_context.get('labels', [])}\n"
            f"Components: {ticket_context.get('components', [])}\n\n"
            "Reply with ONLY 'sufficient' or 'insufficient'."
        )
        response = await client.messages.create(
            model=model,
            max_tokens=10,
            messages=[{"role": "user", "content": prompt}],
        )
        answer = response.content[0].text.strip().lower()
        return "sufficient" in answer
    except Exception as e:
        logger.warning("LLM context assessment failed, falling back to heuristic: %s", e)
        return _heuristic_sufficiency(ticket_context)


def _heuristic_sufficiency(ticket_context: dict) -> bool:
    """Simple heuristic: ticket needs a description of at least 50 chars."""
    desc = ticket_context.get("description") or ""
    return len(desc) >= 50


async def identify_missing_context(
    ticket_context: dict, anthropic_api_key: str | None, model: str
) -> str:
    """Identify what's missing from a ticket for implementation."""
    if not anthropic_api_key:
        return _heuristic_missing(ticket_context)

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
        prompt = (
            "This Jira ticket lacks sufficient context for implementation. "
            "List the specific missing information needed:\n\n"
            f"Summary: {ticket_context.get('summary', '')}\n"
            f"Description: {ticket_context.get('description', '')}\n"
            f"Type: {ticket_context.get('type', '')}\n\n"
            "Reply with a bullet list of missing items."
        )
        response = await client.messages.create(
            model=model,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.warning("LLM missing context failed, using heuristic: %s", e)
        return _heuristic_missing(ticket_context)


def _heuristic_missing(ticket_context: dict) -> str:
    missing = []
    if not ticket_context.get("description") or len(ticket_context.get("description", "")) < 50:
        missing.append("- A detailed description of the expected behavior")
    if not ticket_context.get("components"):
        missing.append("- Which component/service is affected")
    if not ticket_context.get("labels"):
        missing.append("- Labels indicating the area of code (e.g., 'backend', 'api')")
    return "\n".join(missing) if missing else "- More detail about the expected behavior"


def extract_repo_url(ticket_context: dict) -> str | None:
    """Extract a GitHub repo URL from ticket labels, components, or description."""
    desc = ticket_context.get("description") or ""
    urls = re.findall(r"https://github\.com/[\w\-]+/[\w\-]+", desc)
    if urls:
        return urls[0]

    for comment in ticket_context.get("comments", []):
        body = comment.get("body", "")
        urls = re.findall(r"https://github\.com/[\w\-]+/[\w\-]+", body)
        if urls:
            return urls[0]

    return None


def render_coding_prompt(ticket_context: dict) -> str:
    """Build the prompt that gets sent to Claude Code CLI."""
    return (
        f"Implement the following Jira ticket:\n\n"
        f"## {ticket_context.get('ticket_id', 'UNKNOWN')}: {ticket_context.get('summary', '')}\n\n"
        f"**Type:** {ticket_context.get('type', 'Task')}\n"
        f"**Priority:** {ticket_context.get('priority', 'Medium')}\n\n"
        f"### Description\n{ticket_context.get('description', 'No description provided')}\n\n"
        f"### Comments\n"
        + "\n".join(f"- **{c['author']}**: {c['body']}" for c in ticket_context.get("comments", []))
        + "\n\n"
        "### Instructions\n"
        "1. Read the existing codebase to understand the structure\n"
        "2. Implement the changes described above\n"
        "3. Write or update tests for your changes\n"
        "4. Ensure all tests pass\n"
        "5. Follow existing code style and conventions\n"
    )


def render_pr_body(ticket_id: str, ticket_context: dict, claude_result: dict | None) -> str:
    """Build the PR description body."""
    body = (
        f"## {ticket_id}: {ticket_context.get('summary', '')}\n\n"
        f"**Jira:** {ticket_id}\n"
        f"**Type:** {ticket_context.get('type', 'Task')}\n"
        f"**Priority:** {ticket_context.get('priority', 'Medium')}\n\n"
        f"### Description\n{ticket_context.get('description', '')}\n\n"
        f"---\n"
        f"*Automated by DevAgent*\n"
    )
    if claude_result and claude_result.get("cost_usd"):
        body += f"\nClaude Code cost: ${claude_result['cost_usd']:.4f}\n"
    return body


def make_branch_name(ticket_id: str, summary: str) -> str:
    """Generate a git branch name from ticket ID and summary."""
    slug = slugify(summary, max_length=40)
    return f"fix/{ticket_id.lower()}-{slug}"


def inject_claude_md(repo_path: str, ticket_context: dict) -> None:
    """Write a CLAUDE.md file into the cloned repo with ticket context."""
    claude_md = (
        f"# DevAgent Task Context\n\n"
        f"## Ticket: {ticket_context.get('ticket_id', 'UNKNOWN')}\n"
        f"**Summary:** {ticket_context.get('summary', '')}\n"
        f"**Type:** {ticket_context.get('type', 'Task')}\n"
        f"**Priority:** {ticket_context.get('priority', 'Medium')}\n\n"
        f"## Description\n{ticket_context.get('description', '')}\n\n"
        f"## Guidelines\n"
        f"- Follow existing code conventions\n"
        f"- Write tests for new functionality\n"
        f"- Keep changes focused on the ticket scope\n"
    )
    path = Path(repo_path) / "CLAUDE.md"
    # Don't overwrite if one already exists — append context instead
    if path.exists():
        existing = path.read_text()
        path.write_text(existing + "\n\n" + claude_md)
    else:
        path.write_text(claude_md)
