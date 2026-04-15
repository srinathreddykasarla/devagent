from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from devagent.config import get_settings
from devagent.pipelines.base import BasePipeline
from devagent.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)


class JiraSummaryState(TypedDict, total=False):
    project: str
    status_filter: str | None
    tickets: list[dict]
    ticket_count: int
    summary: str
    error: str | None


def _render_tickets_for_llm(tickets: list[dict]) -> str:
    """Format tickets into a concise text block for the LLM prompt."""
    lines = []
    for t in tickets:
        assignee = t.get("assignee", "Unassigned")
        desc = (t.get("description") or "")[:200]
        lines.append(
            f"- [{t['ticket_id']}] ({t['priority']}, {t['status']}, {t['type']}) "
            f"Assigned: {assignee}\n"
            f"  Summary: {t['summary']}\n"
            f"  Description: {desc}"
        )
    return "\n".join(lines)


def _heuristic_summary(project: str, tickets: list[dict]) -> str:
    """Generate a basic summary without LLM when no API key is configured."""
    by_status: dict[str, list[str]] = {}
    by_priority: dict[str, int] = {}
    by_type: dict[str, int] = {}
    unassigned = []

    for t in tickets:
        status = t["status"]
        by_status.setdefault(status, []).append(t["ticket_id"])
        by_priority[t["priority"]] = by_priority.get(t["priority"], 0) + 1
        by_type[t["type"]] = by_type.get(t["type"], 0) + 1
        if t.get("assignee") == "Unassigned":
            unassigned.append(t["ticket_id"])

    lines = [f"# {project} Backlog Summary ({len(tickets)} tickets)\n"]

    lines.append("## By Status")
    for status, ids in by_status.items():
        lines.append(f"- **{status}**: {len(ids)} ({', '.join(ids)})")

    lines.append("\n## By Priority")
    for priority, count in sorted(by_priority.items()):
        lines.append(f"- **{priority}**: {count}")

    lines.append("\n## By Type")
    for typ, count in sorted(by_type.items()):
        lines.append(f"- **{typ}**: {count}")

    if unassigned:
        lines.append(f"\n## Unassigned ({len(unassigned)})")
        lines.append(", ".join(unassigned))

    return "\n".join(lines)


def build_jira_summary_graph(plugins: PluginRegistry) -> StateGraph:
    """Build the LangGraph state machine for Jira backlog summary."""
    settings = get_settings()
    jira = plugins.get("jira")

    async def fetch_tickets(state: JiraSummaryState) -> dict:
        project = state["project"]
        status_filter = state.get("status_filter")
        logger.info("Fetching tickets for project %s", project)

        result = await jira.execute("search_tickets", {
            "project": project,
            "status": status_filter,
            "max_results": 50,
        })
        return {
            "tickets": result["tickets"],
            "ticket_count": result["ticket_count"],
        }

    async def summarize(state: JiraSummaryState) -> dict:
        project = state["project"]
        tickets = state["tickets"]

        if not tickets:
            return {"summary": f"No tickets found in project {project}."}

        if not settings.anthropic_api_key:
            logger.info("No Anthropic API key, using heuristic summary")
            return {"summary": _heuristic_summary(project, tickets)}

        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            ticket_text = _render_tickets_for_llm(tickets)

            prompt = (
                f"You are analyzing the Jira backlog for project '{project}'. "
                f"There are {len(tickets)} tickets.\n\n"
                f"Tickets:\n{ticket_text}\n\n"
                "Provide a concise executive summary covering:\n"
                "1. **Overview** — what this project/backlog is about based on the tickets\n"
                "2. **Priority breakdown** — what's high priority and needs attention first\n"
                "3. **Status distribution** — what's in progress vs blocked vs to-do\n"
                "4. **Key themes** — group related tickets into themes/areas\n"
                "5. **Risks & blockers** — anything that looks stuck or concerning\n"
                "6. **Recommendations** — what should be tackled next\n\n"
                "Be specific — reference ticket IDs. Keep it under 500 words."
            )

            logger.info("Generating LLM summary for %d tickets", len(tickets))
            response = await client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )
            return {"summary": response.content[0].text.strip()}
        except Exception as e:
            logger.warning("LLM summary failed, falling back to heuristic: %s", e)
            return {"summary": _heuristic_summary(project, tickets)}

    graph = StateGraph(JiraSummaryState)
    graph.add_node("fetch_tickets", fetch_tickets)
    graph.add_node("summarize", summarize)

    graph.set_entry_point("fetch_tickets")
    graph.add_edge("fetch_tickets", "summarize")
    graph.add_edge("summarize", END)

    return graph


class JiraSummaryPipeline(BasePipeline):
    name = "jira_summary"
    description = "Fetch all tickets from a Jira project and generate a backlog summary"

    def __init__(self, plugins: PluginRegistry) -> None:
        self._plugins = plugins

    async def run(self, params: dict[str, Any]) -> dict[str, Any]:
        project = params.get("project")
        if not project:
            return {"error": "project is required (e.g. 'SCRUM')"}

        graph = build_jira_summary_graph(self._plugins)
        compiled = graph.compile()
        initial_state: JiraSummaryState = {
            "project": project,
            "status_filter": params.get("status"),
        }
        result = await compiled.ainvoke(initial_state)
        return dict(result)
