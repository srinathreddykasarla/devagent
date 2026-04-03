import { Link } from "react-router-dom";
import { useHealth, usePlugins, useRuns, usePipelines, useRunPipeline } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import type { Run } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function statusColor(status: Run["status"]): string {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "running":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function Dashboard() {
  const health = useHealth();
  const plugins = usePlugins();
  const runs = useRuns();
  const pipelines = usePipelines();
  const runPipeline = useRunPipeline();

  const recentRuns = runs.data?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Overview of system health, plugin status, and recent activity.
      </p>

      {/* Health Status */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium mb-2">System Health</h3>
        {health.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking...</p>
        ) : health.isError ? (
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm text-red-600">Unhealthy — API unreachable</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                health.data?.status === "ok" ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-sm">
              {health.data?.status === "ok" ? "All systems operational" : `Status: ${health.data?.status}`}
            </span>
          </div>
        )}
      </div>

      {/* Plugin Status Cards */}
      <div>
        <h3 className="text-sm font-medium mb-3">Plugin Status</h3>
        {plugins.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading plugins...</p>
        ) : plugins.isError ? (
          <p className="text-sm text-red-600">Failed to load plugins.</p>
        ) : plugins.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plugins registered.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.data?.map((plugin) => (
              <div key={plugin.name} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      plugin.healthy ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <span className="text-sm font-medium">{plugin.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plugin.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Recent Runs</h3>
          <Link
            to="/runs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        {runs.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading runs...</p>
        ) : runs.isError ? (
          <p className="text-sm text-red-600">Failed to load runs.</p>
        ) : recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Run ID</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Started</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        to={`/runs/${run.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {run.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          statusColor(run.status)
                        )}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {formatTime(run.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
        {pipelines.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading pipelines...</p>
        ) : pipelines.isError ? (
          <p className="text-sm text-red-600">Failed to load pipelines.</p>
        ) : pipelines.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pipelines available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pipelines.data?.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => runPipeline.mutate({ id: pipeline.id, params: {} })}
                disabled={runPipeline.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Run {pipeline.name}
              </button>
            ))}
          </div>
        )}
        {runPipeline.isError && (
          <p className="text-sm text-red-600 mt-2">
            Failed to trigger pipeline: {(runPipeline.error as Error).message}
          </p>
        )}
        {runPipeline.isSuccess && (
          <p className="text-sm text-green-600 mt-2">Pipeline triggered successfully.</p>
        )}
      </div>
    </div>
  );
}
