import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, FileCode } from "lucide-react";
import { useRun } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { LogEntry, Run } from "@/lib/types";
import { formatDuration, formatRelativeTime, shortId } from "@/lib/format";
import {
  Badge,
  CopyButton,
  LogStream,
  Panel,
} from "@/components/ui";

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading, isError, error } = useRun(runId ?? "");

  const isRunning = run?.status === "running";
  const { messages: wsMessages } = useWebSocket(isRunning ? (runId ?? null) : null);

  // Merge stored logs with live WebSocket messages, converted to LogEntry shape.
  const entries: LogEntry[] = useMemo(() => {
    if (!run) return [];
    const wsEntries: LogEntry[] = wsMessages.map((m) => ({
      timestamp: m.timestamp ?? new Date().toISOString(),
      level: m.type,
      message: m.message,
    }));
    return [...run.logs, ...wsEntries];
  }, [run, wsMessages]);

  if (isLoading) {
    return (
      <div className="p-10 text-[12px] text-[hsl(var(--muted))]">loading run...</div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-[12px] text-[hsl(var(--danger))]">
        failed to load: {(error as Error).message}
      </div>
    );
  }

  if (!run) {
    return <div className="p-10 text-[12px] text-[hsl(var(--muted))]">run not found</div>;
  }

  return (
    <div className="space-y-4 anim-fade-in-up h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader run={run} />

      {/* Split: meta on left, logs on right */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <div className="space-y-4 overflow-y-auto pr-1">
          <Panel title="metadata">
            <dl className="space-y-2.5 text-[11.5px]">
              <MetaRow label="id">
                <span className="font-[var(--font-mono)] text-[11px] break-all">{run.id}</span>
              </MetaRow>
              <MetaRow label="task">
                <span className="font-[var(--font-mono)] text-[11px] break-all">{run.task_id}</span>
              </MetaRow>
              <MetaRow label="started">
                <span title={new Date(run.started_at).toLocaleString()}>
                  {formatRelativeTime(run.started_at)}
                </span>
              </MetaRow>
              <MetaRow label="finished">
                <span>
                  {run.finished_at ? formatRelativeTime(run.finished_at) : "—"}
                </span>
              </MetaRow>
              <MetaRow label="duration">
                <span className="tabular-nums">
                  {formatDuration(run.started_at, run.finished_at)}
                </span>
              </MetaRow>
              {run.retry_count > 0 && (
                <MetaRow label="retries">
                  <span className="text-[hsl(var(--warning))]">{run.retry_count}</span>
                </MetaRow>
              )}
            </dl>
          </Panel>

          {run.error && (
            <Panel
              title="error"
              actions={<CopyButton value={run.error} size="sm" />}
            >
              <div className="flex items-start gap-2 text-[11.5px] text-[hsl(var(--danger))]">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <pre className="whitespace-pre-wrap break-words font-[var(--font-mono)] leading-relaxed">
                  {run.error}
                </pre>
              </div>
            </Panel>
          )}

          {run.result && Object.keys(run.result).length > 0 && (
            <Panel
              title="result"
              actions={
                <CopyButton value={JSON.stringify(run.result, null, 2)} size="sm" />
              }
            >
              <details open>
                <summary className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.08em] text-[hsl(var(--muted))] cursor-pointer list-none mb-2">
                  <FileCode size={11} />
                  json output
                </summary>
                <pre className="text-[11px] font-[var(--font-mono)] leading-relaxed whitespace-pre-wrap text-[hsl(var(--muted))] max-h-80 overflow-y-auto bg-[hsl(var(--bg))] p-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--border))]">
                  {JSON.stringify(run.result, null, 2)}
                </pre>
              </details>
            </Panel>
          )}
        </div>

        {/* Logs */}
        <div className="flex flex-col min-h-0">
          <LogStream
            entries={entries}
            live={isRunning}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-20 shrink-0 text-[10px] uppercase tracking-[0.1em] text-[hsl(var(--subtle))] pt-0.5">
        {label}
      </dt>
      <dd className="flex-1 min-w-0 text-[hsl(var(--fg))]">{children}</dd>
    </div>
  );
}

function PageHeader({ run }: { run: Run }) {
  const variantMap = {
    success: "success" as const,
    failed: "danger" as const,
    running: "running" as const,
    cancelled: "warning" as const,
    pending: "default" as const,
  };
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--fg-strong))] font-[var(--font-mono)]">
            {shortId(run.id)}
          </h1>
          <Badge
            variant={variantMap[run.status] ?? "default"}
            pulse={run.status === "running"}
            upper
          >
            {run.status}
          </Badge>
        </div>
        <p className="mt-1 text-[11.5px] text-[hsl(var(--muted))]">
          task · {run.task_id}
        </p>
      </div>
    </div>
  );
}
