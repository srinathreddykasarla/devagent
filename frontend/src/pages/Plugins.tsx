import { usePlugins } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

export default function Plugins() {
  const { data: plugins, isLoading, isError, error, refetch, isRefetching } = usePlugins();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Integration status and health checks.
        </p>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          {isRefetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plugins...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Failed to load plugins: {(error as Error).message}
        </p>
      ) : plugins?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No plugins registered.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins?.map((plugin) => (
            <div
              key={plugin.name}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-3 w-3 rounded-full shrink-0",
                    plugin.healthy ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <h3 className="text-sm font-medium">{plugin.name}</h3>
              </div>

              <p className="text-xs text-muted-foreground">{plugin.message}</p>

              {plugin.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {plugin.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
