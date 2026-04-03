import { useParams } from "react-router-dom";
import { useRun } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import type { Run } from "@/lib/types";

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

function logLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case "error":
      return "text-red-600";
    case "warn":
    case "warning":
      return "text-yellow-600";
    case "info":
      return "text-blue-600";
    case "debug":
      return "text-gray-500";
    default:
      return "text-foreground";
  }
}

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading, isError, error } = useRun(runId ?? "");

  const isRunning = run?.status === "running";
  const { messages: wsMessages, connected } = useWebSocket(isRunning ? runId ?? null : null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading run...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600">
        Failed to load run: {(error as Error).message}
      </p>
    );
  }

  if (!run) {
    return <p className="text-sm text-muted-foreground">Run not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium font-mono">{run.id.slice(0, 8)}</h2>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            statusColor(run.status)
          )}
        >
          {run.status}
        </span>
        {isRunning && connected && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Run Details */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Run ID</span>
            <p className="font-mono text-xs">{run.id}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Task ID</span>
            <p className="font-mono text-xs">{run.task_id}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Started</span>
            <p className="text-xs">{new Date(run.started_at).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Finished</span>
            <p className="text-xs">
              {run.finished_at ? new Date(run.finished_at).toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Retry Count</span>
            <p>{run.retry_count}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {run.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
          <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap">
            {run.error}
          </pre>
        </div>
      )}

      {/* Result Data */}
      {run.result && Object.keys(run.result).length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Result</h3>
          <pre className="rounded-lg border border-border bg-card p-4 text-xs font-mono overflow-auto">
            {JSON.stringify(run.result, null, 2)}
          </pre>
        </div>
      )}

      {/* Log Viewer */}
      <div>
        <h3 className="text-sm font-medium mb-2">Logs</h3>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="max-h-96 overflow-auto">
            {run.logs.length === 0 && wsMessages.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No log entries.</p>
            ) : (
              <table className="w-full text-xs font-mono">
                <tbody>
                  {run.logs.map((entry, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-1 text-muted-foreground whitespace-nowrap align-top">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1 font-medium whitespace-nowrap uppercase align-top",
                          logLevelColor(entry.level)
                        )}
                      >
                        {entry.level}
                      </td>
                      <td className="px-3 py-1 whitespace-pre-wrap break-all">
                        {entry.message}
                      </td>
                    </tr>
                  ))}
                  {/* Live WebSocket messages appended after stored logs */}
                  {wsMessages.map((msg, i) => (
                    <tr
                      key={`ws-${i}`}
                      className="border-b border-border last:border-0 bg-yellow-50/50"
                    >
                      <td className="px-3 py-1 text-muted-foreground whitespace-nowrap align-top">
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1 font-medium whitespace-nowrap uppercase align-top",
                          logLevelColor(msg.type)
                        )}
                      >
                        {msg.type}
                      </td>
                      <td className="px-3 py-1 whitespace-pre-wrap break-all">
                        {msg.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
