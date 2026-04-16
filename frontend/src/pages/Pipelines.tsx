import { useState } from "react";
import {
  useCreatePipeline,
  useDeletePipeline,
  usePipelines,
  useRunPipeline,
  useTools,
  useUpdatePipeline,
} from "@/hooks/useApi";
import type { Pipeline } from "@/lib/types";
import { cn } from "@/lib/utils";

type DialogMode = "create" | "edit" | "run" | null;

interface EditorForm {
  name: string;
  description: string;
  system_prompt: string;
  default_params: string; // raw JSON
}

const EMPTY_FORM: EditorForm = {
  name: "",
  description: "",
  system_prompt: "",
  default_params: "{}",
};

export default function Pipelines() {
  const { data: pipelines, isLoading, isError, error } = usePipelines();
  const { data: tools } = useTools();
  const runPipeline = useRunPipeline();
  const createPipeline = useCreatePipeline();
  const deletePipeline = useDeletePipeline();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [paramsInput, setParamsInput] = useState("{}");
  const [formError, setFormError] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);

  const updatePipeline = useUpdatePipeline(activePipeline?.id ?? "");

  function openCreate() {
    setActivePipeline(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogMode("create");
  }

  function openEdit(p: Pipeline) {
    setActivePipeline(p);
    setForm({
      name: p.name,
      description: p.description,
      system_prompt: p.system_prompt,
      default_params: JSON.stringify(p.default_params ?? {}, null, 2),
    });
    setFormError(null);
    setDialogMode("edit");
  }

  function openRun(p: Pipeline) {
    setActivePipeline(p);
    setParamsInput(JSON.stringify(p.default_params ?? {}, null, 2));
    setFormError(null);
    setDialogMode("run");
  }

  function closeDialog() {
    setDialogMode(null);
    setActivePipeline(null);
    setForm(EMPTY_FORM);
    setParamsInput("{}");
    setFormError(null);
  }

  function parseJsonOrError(raw: string): Record<string, unknown> | null {
    try {
      const v = JSON.parse(raw);
      if (typeof v !== "object" || v === null || Array.isArray(v)) {
        setFormError("Must be a JSON object");
        return null;
      }
      return v as Record<string, unknown>;
    } catch (e) {
      setFormError(`Invalid JSON: ${(e as Error).message}`);
      return null;
    }
  }

  function handleSaveCreate() {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.system_prompt.trim()) {
      setFormError("System prompt is required");
      return;
    }
    const params = parseJsonOrError(form.default_params);
    if (params === null) return;

    createPipeline.mutate(
      {
        name: form.name.trim(),
        description: form.description,
        system_prompt: form.system_prompt,
        default_params: params,
      },
      {
        onSuccess: closeDialog,
        onError: (err) => setFormError((err as Error).message),
      },
    );
  }

  function handleSaveEdit() {
    if (!activePipeline) return;
    setFormError(null);
    const params = parseJsonOrError(form.default_params);
    if (params === null) return;

    updatePipeline.mutate(
      {
        name: form.name,
        description: form.description,
        system_prompt: form.system_prompt,
        default_params: params,
      },
      {
        onSuccess: closeDialog,
        onError: (err) => setFormError((err as Error).message),
      },
    );
  }

  function handleRun() {
    if (!activePipeline) return;
    setFormError(null);
    const params = parseJsonOrError(paramsInput);
    if (params === null) return;

    runPipeline.mutate(
      { id: activePipeline.id, params },
      {
        onSuccess: closeDialog,
        onError: (err) => setFormError((err as Error).message),
      },
    );
  }

  function handleDelete(p: Pipeline) {
    if (!confirm(`Delete pipeline "${p.name}"?`)) return;
    deletePipeline.mutate(p.id);
  }

  const isSaving = createPipeline.isPending || updatePipeline.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Prompt-driven pipelines. Edit the system prompt to change behavior — the
          orchestrator will call tools based on what you write.
        </p>
        <button
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Create Pipeline
        </button>
      </div>

      {/* Tools reference panel */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowTools((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>
            Available Tools {tools ? `(${tools.length})` : ""}
          </span>
          <span className="text-muted-foreground">{showTools ? "▼" : "▶"}</span>
        </button>
        {showTools && tools && (
          <div className="border-t border-border px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
            {tools.map((t) => (
              <div key={t.name} className="text-xs">
                <span className="font-mono font-medium">{t.name}</span>
                <span className="text-muted-foreground"> — {t.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipelines...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Failed to load pipelines: {(error as Error).message}
        </p>
      ) : pipelines?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pipelines yet. Click "+ Create Pipeline".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines?.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium break-words">{p.name}</h3>
                <div className="flex gap-1 shrink-0">
                  {p.is_builtin && (
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                      built-in
                    </span>
                  )}
                  {p.source === "legacy" && (
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-800">
                      legacy
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground min-h-[2.5rem]">
                {p.description || "No description"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openRun(p)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Run
                </button>
                {p.source !== "legacy" && (
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {!p.is_builtin && p.source === "db" && (
                  <button
                    onClick={() => handleDelete(p)}
                    className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      {(dialogMode === "create" || dialogMode === "edit") && (
        <Modal onClose={closeDialog}>
          <h3 className="text-sm font-medium">
            {dialogMode === "create" ? "Create Pipeline" : `Edit: ${activePipeline?.name}`}
          </h3>
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={dialogMode === "edit" && activePipeline?.is_builtin}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </Field>
          <Field label="Description">
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="System Prompt">
            <textarea
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              rows={14}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Describe what the pipeline does. Reference tools by name, e.g. jira__read_ticket, github__clone_repo..."
            />
          </Field>
          <Field label="Default Params (JSON)">
            <textarea
              value={form.default_params}
              onChange={(e) => setForm({ ...form, default_params: e.target.value })}
              rows={4}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={closeDialog}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={dialogMode === "create" ? handleSaveCreate : handleSaveEdit}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {/* Run Dialog */}
      {dialogMode === "run" && activePipeline && (
        <Modal onClose={closeDialog}>
          <h3 className="text-sm font-medium">Run: {activePipeline.name}</h3>
          <p className="text-xs text-muted-foreground">{activePipeline.description}</p>
          {activePipeline.system_prompt && (
            <details className="rounded border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
                View system prompt
              </summary>
              <pre className="px-3 py-2 text-xs font-mono whitespace-pre-wrap border-t border-border max-h-48 overflow-y-auto">
                {activePipeline.system_prompt}
              </pre>
            </details>
          )}
          <Field label="Params (JSON)">
            <textarea
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              rows={6}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </Field>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={closeDialog}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={runPipeline.isPending}
              className={cn(
                "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90 disabled:opacity-50 transition-colors",
              )}
            >
              {runPipeline.isPending ? "Running..." : "Run"}
            </button>
          </div>
        </Modal>
      )}

      {runPipeline.isSuccess && !dialogMode && (
        <p className="text-sm text-green-600">
          Pipeline triggered successfully. Check the Runs page.
        </p>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-lg border border-border bg-card p-6 shadow-lg w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
