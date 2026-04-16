import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home, Moon, Sun } from "lucide-react";
import { useRun, useRuns, useTask } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";
import { shortId } from "@/lib/format";
import { Button } from "@/components/ui/Button";

const SECTION_LABELS: Record<string, string> = {
  "/": "dashboard",
  "/tasks": "tasks",
  "/pipelines": "pipelines",
  "/plugins": "plugins",
  "/runs": "runs",
};

export function Header() {
  const location = useLocation();
  const path = location.pathname;
  const params = useParams();
  const runs = useRuns();
  const { theme, toggle } = useTheme();

  const taskQuery = useTask(params.taskId ?? "");
  const runQuery = useRun(params.runId ?? "");

  const crumbs = buildCrumbs(path, {
    taskName: taskQuery.data?.name,
    runId: runQuery.data ? shortId(runQuery.data.id) : null,
  });

  const liveCount = runs.data?.filter((r) => r.status === "running").length ?? 0;

  return (
    <header className="sticky top-0 z-20 h-12 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg))]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4">
      <nav className="flex items-center gap-1.5 text-[12px] min-w-0" aria-label="Breadcrumb">
        <Link
          to="/"
          className="text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] transition-colors shrink-0"
          aria-label="Home"
        >
          <Home size={13} />
        </Link>
        {crumbs.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight size={11} className="text-[hsl(var(--subtle))] shrink-0" />
            {c.to ? (
              <Link
                to={c.to}
                className="text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] transition-colors truncate"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-[hsl(var(--fg-strong))] font-medium truncate">
                {c.label}
              </span>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {liveCount > 0 && (
          <Link
            to="/runs"
            className="flex items-center gap-1.5 px-2 h-7 rounded-[var(--radius-sm)] bg-[hsl(var(--running)/0.12)] border border-[hsl(var(--running)/0.35)] text-[hsl(var(--running))] text-[10.5px] font-medium uppercase tracking-[0.1em] hover:bg-[hsl(var(--running)/0.18)] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--running))] anim-pulse-dot" />
            live · {liveCount}
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-label="Toggle theme"
          className="w-7 h-7 px-0"
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
        </Button>
      </div>
    </header>
  );
}

function buildCrumbs(
  path: string,
  ctx: { taskName?: string; runId?: string | null },
): { label: string; to?: string }[] {
  // "/" -> dashboard
  if (path === "/") return [{ label: "dashboard" }];

  // Match top-level
  const parts = path.split("/").filter(Boolean);
  const section = `/${parts[0]}`;
  const sectionLabel = SECTION_LABELS[section] ?? parts[0];

  if (parts.length === 1) {
    return [{ label: sectionLabel }];
  }

  // Detail page
  const detailLabel =
    parts[0] === "tasks"
      ? ctx.taskName ?? parts[1]
      : parts[0] === "runs"
        ? ctx.runId ?? parts[1].slice(0, 8)
        : parts[1];

  return [{ label: sectionLabel, to: section }, { label: detailLabel }];
}
