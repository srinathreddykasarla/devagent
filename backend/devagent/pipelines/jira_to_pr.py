from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from devagent.config import get_settings
from devagent.pipelines.base import BasePipeline
from devagent.pipelines.helpers import (
    assess_context_sufficiency,
    extract_repo_url,
    identify_missing_context,
    inject_claude_md,
    make_branch_name,
    render_coding_prompt,
    render_pr_body,
)
from devagent.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)


class JiraToPRState(TypedDict, total=False):
    ticket_id: str
    ticket_context: dict | None
    has_sufficient_context: bool
    repo_url: str | None
    repo_path: str | None
    branch_name: str | None
    claude_code_result: dict | None
    pr_url: str | None
    error: str | None


def build_jira_to_pr_graph(plugins: PluginRegistry) -> StateGraph:
    """Build the LangGraph state machine for Jira-to-PR pipeline."""
    settings = get_settings()
    jira = plugins.get("jira")
    github = plugins.get("github")

    async def read_jira(state: JiraToPRState) -> dict:
        ticket_id = state["ticket_id"]
        logger.info("Reading Jira ticket %s", ticket_id)
        context = await jira.execute("read_ticket", {"ticket_id": ticket_id})
        context["ticket_id"] = ticket_id

        sufficient = await assess_context_sufficiency(
            context, settings.anthropic_api_key, settings.anthropic_model
        )
        # Use repo_url from params if provided, otherwise try to extract from ticket
        repo_url = state.get("repo_url") or extract_repo_url(context)

        return {
            "ticket_context": context,
            "has_sufficient_context": sufficient,
            "repo_url": repo_url,
        }

    async def request_more_context(state: JiraToPRState) -> dict:
        ticket_id = state["ticket_id"]
        logger.info("Requesting more context for %s", ticket_id)
        missing = await identify_missing_context(
            state["ticket_context"], settings.anthropic_api_key, settings.anthropic_model
        )
        await jira.execute(
            "post_comment",
            {
                "ticket_id": ticket_id,
                "body": (
                    "DevAgent: I don't have enough context to implement this ticket. "
                    f"Please provide:\n\n{missing}\n\n"
                    "Once updated, re-trigger the pipeline and I'll try again."
                ),
            },
        )
        return {"error": "insufficient_context"}

    async def setup_repo(state: JiraToPRState) -> dict:
        logger.info("Setting up repo from %s", state["repo_url"])
        result = await github.execute("clone_repo", {"url": state["repo_url"]})
        repo_path = result["repo_path"]

        branch = make_branch_name(state["ticket_id"], state["ticket_context"]["summary"])
        await github.execute("create_branch", {"repo_path": repo_path, "branch": branch})
        inject_claude_md(repo_path, state["ticket_context"])

        return {"repo_path": repo_path, "branch_name": branch}

    async def run_claude_code(state: JiraToPRState) -> dict:
        from devagent.agents.claude_code import execute_claude_code

        logger.info("Running Claude Code in %s", state["repo_path"])
        prompt = render_coding_prompt(state["ticket_context"])
        result = await execute_claude_code(
            repo_path=state["repo_path"],
            prompt=prompt,
            max_turns=settings.claude_code_max_turns,
            timeout=settings.claude_code_timeout,
            allowed_tools=settings.claude_code_allowed_tools,
            claude_path=settings.claude_code_path,
        )
        return {"claude_code_result": result}

    async def create_pr(state: JiraToPRState) -> dict:
        ticket_id = state["ticket_id"]
        logger.info("Creating PR for %s", ticket_id)
        pr_body = render_pr_body(ticket_id, state["ticket_context"], state["claude_code_result"])
        pr_result = await github.execute(
            "create_pr",
            {
                "repo_path": state["repo_path"],
                "url": state["repo_url"],
                "branch": state["branch_name"],
                "title": f"{ticket_id}: {state['ticket_context']['summary']}",
                "body": pr_body,
                "base": "main",
            },
        )
        await jira.execute(
            "post_comment",
            {
                "ticket_id": ticket_id,
                "body": f"DevAgent: PR created -> {pr_result['pr_url']}",
            },
        )
        return {"pr_url": pr_result["pr_url"]}

    async def no_repo_url(state: JiraToPRState) -> dict:
        ticket_id = state["ticket_id"]
        logger.warning("No repo URL found for %s", ticket_id)
        await jira.execute(
            "post_comment",
            {
                "ticket_id": ticket_id,
                "body": (
                    "DevAgent: Could not find a GitHub repository URL in this ticket. "
                    "Please add the repo URL to the description or re-run with "
                    '{"ticket_id": "' + ticket_id + '", "repo_url": "https://github.com/owner/repo"}.'
                ),
            },
        )
        return {"error": "no_repo_url"}

    def route_after_jira(state: JiraToPRState) -> str:
        if not state.get("has_sufficient_context"):
            return "request_context"
        if not state.get("repo_url"):
            return "no_repo_url"
        return "setup_repo"

    graph = StateGraph(JiraToPRState)
    graph.add_node("read_jira", read_jira)
    graph.add_node("request_context", request_more_context)
    graph.add_node("no_repo_url", no_repo_url)
    graph.add_node("setup_repo", setup_repo)
    graph.add_node("run_claude_code", run_claude_code)
    graph.add_node("create_pr", create_pr)

    graph.set_entry_point("read_jira")
    graph.add_conditional_edges("read_jira", route_after_jira)
    graph.add_edge("request_context", END)
    graph.add_edge("no_repo_url", END)
    graph.add_edge("setup_repo", "run_claude_code")
    graph.add_edge("run_claude_code", "create_pr")
    graph.add_edge("create_pr", END)

    return graph


class JiraToPRPipeline(BasePipeline):
    name = "jira_to_pr"
    description = "Read a Jira ticket, implement changes with Claude Code, create a PR"

    def __init__(self, plugins: PluginRegistry) -> None:
        self._plugins = plugins

    async def run(self, params: dict[str, Any]) -> dict[str, Any]:
        if "ticket_id" not in params:
            return {"error": "ticket_id is required"}
        graph = build_jira_to_pr_graph(self._plugins)
        compiled = graph.compile()
        initial_state: JiraToPRState = {
            "ticket_id": params["ticket_id"],
            "repo_url": params.get("repo_url"),
        }
        result = await compiled.ainvoke(initial_state)
        return dict(result)
