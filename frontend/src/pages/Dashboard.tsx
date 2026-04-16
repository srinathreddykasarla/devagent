import { Link } from "react-router-dom";
import { Activity, Plus, Play, Workflow } from "lucide-react";
import {
  useHealth,
  usePipelines,
  usePlugins,
  useRunPipeline,
  useRuns,
} from "@/hooks/useApi";
import { formatDuration, formatRelativeTime, shortId } from "@/lib/format";
import type { Run } from "@/lib/types";
import {
  Badge,
  Button,
  Panel,
  StatusDot,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  EmptyState,
} from "@/components/ui";

export default function Dashboard() {
  const health = useHealth();
  const plugins = usePlugins();
  const runs = useRuns();
  const pipelines = usePipelines();
  const runPipeline = useRunPipeline();

  const recentRuns = runs.data?.slice(0, 6) ?? [];
  const runningCount = runs.data?.filter((r) => r.status === "running").length ?? 0;

  const apiTone =
    health.isLoading ? "muted" : health.isError ? "danger" : "success";
  const apiLabel = health.isLoading
    ? "checking"
    : health.isError
      ? "unreachable"
      : "online";

  return (
    <div className="space-y-5 anim-fade-in-up">
      <PageHeader
        title="dashboard"
        subtitle={timestampLine()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        {/* LEFT: Status grid */}
        <Panel title="system status" subtitle="live telemetry">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            <StatusLine name="api" tone={apiTone} label={apiLabel} />
            <StatusLine
              name="ui"
              tone="success"
              label="serving"
            />
            {plugins.data?.map((p) => (
              <StatusLine
                key={p.name}
                name={p.name}
                tone={p.healthy ? "success" : "danger"}
                label={p.healthy ? "ok" : "down"}
                detail={p.message}
              />
            ))}
          </div>
        </Panel>

        {/* RIGHT: Counters */}
        <Panel title="active">
          <div className="grid grid-cols-3 gap-2">
            <Counter label="running" value={runningCount} tone="running" />
            <Counter label="pipelines" value={pipelines.data?.length ?? 0} />
            <Counter label="plugins" value={plugins.data?.length ?? 0} />
          </div>
        </Panel>
      </div>

      <Panel
        title="recent runs"
        subtitle={`${runs.data?.length ?? 0} total`}
        actions={
          <Link
            to="/runs"
            className="text-[11px] text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))] transition-colors"
          >
            all →
          </Link>
        }
        bleed
      >
        {runs.isLoading ? (
          <div className="p-5 text-[12px] text-[hsl(var(--muted))]">loading...</div>
        ) : runs.isError ? (
          <div className="p-5 text-[12px] text-[hsl(var(--danger))]">
            failed to load runs
          </div>
        ) : recentRuns.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No runs yet"
            description="Dispatch a pipeline below to see executions stream in."
            compact
          />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th className="w-[100px]">time</Th>
                <Th className="w-[120px]">status</Th>
                <Th>task</Th>
                <Th className="w-[90px]">duration</Th>
                <Th className="w-[100px]">id</Th>
              </Tr>
            </THead>
            <TBody>
              {recentRuns.map((r) => (
                <DashboardRunRow key={r.id} run={r} />
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Panel title="quick dispatch" subtitle="click to run with default params">
        {pipelines.isLoading ? (
          <div className="text-[12px] text-[hsl(var(--muted))]">loading...</div>
        ) : pipelines.data?.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No pipelines defined"
            description="Create a pipeline to dispatch agents."
            action={
              <Link to="/pipelines">
                <Button variant="primary" iconLeft={<Plus size={12} />}>
                  create pipeline
                </Button>
              </Link>
            }
            compact
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {pipelines.data?.map((p) => (
              <Button
                key={p.id}
                variant="secondary"
                iconLeft={<Play size={11} />}
                onClick={() => runPipeline.mutate({ id: p.id, params: {} })}
                disabled={runPipeline.isPending}
              >
                {p.name}
              </Button>
            ))}
            <Link to="/pipelines">
              <Button variant="ghost" iconLeft={<Plus size={11} />}>
                new pipeline
              </Button>
            </Link>
          </div>
        )}
        {runPipeline.isSuccess && (
          <p className="mt-3 text-[11.5px] text-[hsl(var(--success))]">
            → dispatched · check runs
          </p>
        )}
      </Panel>
    </div>
  );
}

function StatusLine({
  name,
  tone,
  label,
  detail,
}: {
  name: string;
  tone: "success" | "danger" | "warning" | "muted" | "running";
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <StatusDot tone={tone} pulse={tone === "running"} />
      <span className="text-[12px] text-[hsl(var(--fg))] font-medium w-20 shrink-0">
        {name}
      </span>
      <span className="text-[11px] text-[hsl(var(--muted))] truncate" title={detail}>
        {label}
        {detail && <span className="ml-1 text-[hsl(var(--subtle))]">· {detail}</span>}
      </span>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "running";
}) {
  return (
    <div className="px-2 py-3 bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)]">
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-[28px] font-semibold tabular-nums tracking-tight ${
            tone === "running" && value > 0
              ? "text-[hsl(var(--running))]"
              : "text-[hsl(var(--fg-strong))]"
          }`}
        >
          {value}
        </span>
        {tone === "running" && value > 0 && (
          <StatusDot tone="running" pulse />
        )}
      </div>
      <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
        {label}
      </div>
    </div>
  );
}

function DashboardRunRow({ run }: { run: Run }) {
  const variantMap = {
    success: "success" as const,
    failed: "danger" as const,
    running: "running" as const,
    cancelled: "warning" as const,
    pending: "default" as const,
  };
  return (
    <Tr>
      <Td className="text-[hsl(var(--muted))]">
        <Link
          to={`/runs/${run.id}`}
          className="hover:text-[hsl(var(--fg))] transition-colors"
          title={new Date(run.started_at).toLocaleString()}
        >
          {formatRelativeTime(run.started_at)}
        </Link>
      </Td>
      <Td>
        <Badge
          variant={variantMap[run.status] ?? "default"}
          pulse={run.status === "running"}
          upper
        >
          {run.status}
        </Badge>
      </Td>
      <Td>
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

function timestampLine(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}\u00b7${pad(d.getMonth() + 1)}\u00b7${pad(d.getDate())}  ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())} \u00b7 live`;
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--fg-strong))]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[11.5px] text-[hsl(var(--muted))] tabular-nums">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
