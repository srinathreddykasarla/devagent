import { Link } from "react-router-dom";
import { useRuns } from "@/hooks/useApi";
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

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const diffMs = end - start;
  if (diffMs < 1000) return `${diffMs}ms`;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function Runs() {
  const { data: runs, isLoading, isError, error } = useRuns();

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Run history with status and duration.</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading runs...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Failed to load runs: {(error as Error).message}
        </p>
      ) : runs?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Run ID</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Task ID</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Started</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs?.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <Link
                      to={`/runs/${run.id}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {run.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {run.task_id.slice(0, 8)}
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
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {formatDuration(run.started_at, run.finished_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
