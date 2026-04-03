import { useState } from "react";
import { usePipelines, useRunPipeline } from "@/hooks/useApi";

export default function Pipelines() {
  const { data: pipelines, isLoading, isError, error } = usePipelines();
  const runPipeline = useRunPipeline();
  const [runDialogId, setRunDialogId] = useState<string | null>(null);
  const [paramsInput, setParamsInput] = useState("{}");

  function handleRun() {
    if (!runDialogId) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(paramsInput) as Record<string, unknown>;
    } catch {
      alert("Invalid JSON in params field.");
      return;
    }
    runPipeline.mutate(
      { id: runDialogId, params: parsed },
      {
        onSuccess: () => {
          setRunDialogId(null);
          setParamsInput("{}");
        },
      }
    );
  }

  function openRunDialog(id: string) {
    setRunDialogId(id);
    setParamsInput("{}");
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Available pipelines and manual trigger UI.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipelines...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Failed to load pipelines: {(error as Error).message}
        </p>
      ) : pipelines?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pipelines available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines?.map((pipeline) => (
            <div
              key={pipeline.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <h3 className="text-sm font-medium">{pipeline.name}</h3>
              <p className="text-xs text-muted-foreground">{pipeline.description}</p>
              <button
                onClick={() => openRunDialog(pipeline.id)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Run
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Run Dialog (modal overlay) */}
      {runDialogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setRunDialogId(null)}
          />
          <div className="relative rounded-lg border border-border bg-card p-6 shadow-lg w-full max-w-md space-y-4">
            <h3 className="text-sm font-medium">
              Run Pipeline:{" "}
              {pipelines?.find((p) => p.id === runDialogId)?.name ?? runDialogId}
            </h3>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Params (JSON)
              </label>
              <textarea
                value={paramsInput}
                onChange={(e) => setParamsInput(e.target.value)}
                rows={6}
                className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRunDialogId(null)}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={runPipeline.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {runPipeline.isPending ? "Running..." : "Run"}
              </button>
            </div>
            {runPipeline.isError && (
              <p className="text-sm text-red-600">
                Failed: {(runPipeline.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}

      {runPipeline.isSuccess && !runDialogId && (
        <p className="text-sm text-green-600">Pipeline triggered successfully. Check Runs page.</p>
      )}
    </div>
  );
}
