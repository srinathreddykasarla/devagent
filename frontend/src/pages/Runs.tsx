import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Search } from "lucide-react";
import { useRuns } from "@/hooks/useApi";
import type { Run } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDuration, formatRelativeTime, shortId } from "@/lib/format";
import {
  Badge,
  EmptyState,
  Input,
  Panel,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";

type StatusFilter = "all" | "running" | "success" | "failed";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "running", label: "running" },
  { value: "success", label: "success" },
  { value: "failed", label: "failed" },
];

export default function Runs() {
  const { data: runs, isLoading, isError, error } = useRuns();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!runs) return [];
    const q = query.trim().toLowerCase();
    return runs.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !r.task_id.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [runs, filter, query]);

  const counts = useMemo(() => {
    const base = { all: runs?.length ?? 0, running: 0, success: 0, failed: 0 };
    runs?.forEach((r) => {
      if (r.status in base) (base as Record<string, number>)[r.status]++;
    });
    return base;
  }, [runs]);

  return (
    <div className="space-y-5 anim-fade-in-up">
      <PageHeader title="runs" subtitle="execution history · auto-refreshing every 5s" />

      <Panel
        title="execution log"
        subtitle={`${filtered.length} of ${runs?.length ?? 0}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={11}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--subtle))]"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="id or task..."
                className="pl-7 h-7 w-44 text-[11.5px]"
              />
            </div>
            <div className="flex items-center gap-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "px-2 h-7 text-[10.5px] uppercase tracking-[0.08em] rounded-[var(--radius-sm)] transition-colors",
                    filter === f.value
                      ? "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]"
                      : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-hover))]",
                  )}
                >
                  {f.label}
                  <span className="ml-1 text-[hsl(var(--subtle))]">
                    {counts[f.value as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        }
        bleed
      >
        {isLoading ? (
          <div className="p-6 text-[12px] text-[hsl(var(--muted))]">loading runs...</div>
        ) : isError ? (
          <div className="p-6 text-[12px] text-[hsl(var(--danger))]">
            failed to load: {(error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={runs?.length === 0 ? "No runs yet" : "No matching runs"}
            description={
              runs?.length === 0
                ? "Trigger a pipeline from the Pipelines page to see executions here."
                : "Try clearing the filter or search."
            }
          />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th className="w-[120px]">time</Th>
                <Th className="w-[130px]">status</Th>
                <Th>task</Th>
                <Th className="w-[100px]">duration</Th>
                <Th className="w-[110px]">id</Th>
              </Tr>
            </THead>
            <TBody>
              {filtered.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function RunRow({ run }: { run: Run }) {
  const running = run.status === "running";
  return (
    <Tr className={cn("relative", running && "bg-[hsl(var(--running)/0.04)]")}>
      {running && (
        <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[hsl(var(--running))] anim-pulse-dot" />
      )}
      <Td className="text-[hsl(var(--muted))] tabular-nums">
        <span title={new Date(run.started_at).toLocaleString()}>
          {formatRelativeTime(run.started_at)}
        </span>
      </Td>
      <Td>
        <StatusPill status={run.status} />
      </Td>
      <Td className="font-medium">
        <Link
          to={`/runs/${run.id}`}
          className="hover:text-[hsl(var(--accent))] transition-colors"
        >
          {run.task_id}
        </Link>
      </Td>
      <Td className="tabular-nums text-[hsl(var(--muted))]">
        {formatDuration(run.started_at, run.finished_at)}
      </Td>
      <Td className="font-[var(--font-mono)] text-[hsl(var(--subtle))]">
        <Link
          to={`/runs/${run.id}`}
          className="hover:text-[hsl(var(--fg))] transition-colors"
        >
          {shortId(run.id)}
        </Link>
      </Td>
    </Tr>
  );
}

function StatusPill({ status }: { status: Run["status"] }) {
  const variantMap = {
    success: "success" as const,
    failed: "danger" as const,
    running: "running" as const,
    cancelled: "warning" as const,
    pending: "default" as const,
  };
  return (
    <Badge variant={variantMap[status] ?? "default"} pulse={status === "running"} upper>
      {status}
    </Badge>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--fg-strong))]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[11.5px] text-[hsl(var(--muted))]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

