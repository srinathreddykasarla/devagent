import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Play,
  Plus,
  Trash2,
  Workflow,
  Wrench,
} from "lucide-react";
import {
  useCreatePipeline,
  useDeletePipeline,
  usePipelines,
  useRunPipeline,
  useTools,
  useUpdatePipeline,
} from "@/hooks/useApi";
import type { ParamFieldDef, Pipeline } from "@/lib/types";
import { extractToolRefs } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  CopyButton,
  EmptyState,
  Input,
  Label,
  Modal,
  Panel,
  Textarea,
} from "@/components/ui";

type DialogMode = "create" | "edit" | "run" | null;

interface EditorForm {
  name: string;
  description: string;
  system_prompt: string;
  default_params: string;
  param_schema: ParamFieldDef[];
}

const EMPTY_FORM: EditorForm = {
  name: "",
  description: "",
  system_prompt: "",
  default_params: "{}",
  param_schema: [],
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
  const [schemaParams, setSchemaParams] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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
      param_schema: p.param_schema ?? [],
    });
    setFormError(null);
    setDialogMode("edit");
  }

  function openRun(p: Pipeline) {
    setActivePipeline(p);
    setParamsInput(JSON.stringify(p.default_params ?? {}, null, 2));
    if (p.param_schema && p.param_schema.length > 0) {
      const initial: Record<string, string> = {};
      for (const field of p.param_schema) {
        initial[field.key] = String(p.default_params?.[field.key] ?? "");
      }
      setSchemaParams(initial);
    }
    setFormError(null);
    setDialogMode("run");
  }

  function closeDialog() {
    setDialogMode(null);
    setActivePipeline(null);
    setForm(EMPTY_FORM);
    setParamsInput("{}");
    setSchemaParams({});
    setFormError(null);
  }

  function parseJsonOrError(raw: string): Record<string, unknown> | null {
    try {
      const v = JSON.parse(raw);
      if (typeof v !== "object" || v === null || Array.isArray(v)) {
        setFormError("must be a JSON object");
        return null;
      }
      return v as Record<string, unknown>;
    } catch (e) {
      setFormError(`invalid JSON: ${(e as Error).message}`);
      return null;
    }
  }

  function handleSaveCreate() {
    setFormError(null);
    if (!form.name.trim()) return setFormError("name is required");
    if (!form.system_prompt.trim()) return setFormError("system prompt is required");
    const params = parseJsonOrError(form.default_params);
    if (params === null) return;
    createPipeline.mutate(
      {
        name: form.name.trim(),
        description: form.description,
        system_prompt: form.system_prompt,
        default_params: params,
        param_schema: form.param_schema.length > 0 ? form.param_schema : null,
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
        param_schema: form.param_schema.length > 0 ? form.param_schema : null,
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
    if (activePipeline.param_schema && activePipeline.param_schema.length > 0) {
      for (const field of activePipeline.param_schema) {
        if (field.required && !schemaParams[field.key]?.trim()) {
          return setFormError(`"${field.label}" is required`);
        }
      }
      runPipeline.mutate(
        { id: activePipeline.id, params: { ...schemaParams } },
        { onSuccess: closeDialog, onError: (err) => setFormError((err as Error).message) },
      );
    } else {
      const params = parseJsonOrError(paramsInput);
      if (params === null) return;
      runPipeline.mutate(
        { id: activePipeline.id, params },
        { onSuccess: closeDialog, onError: (err) => setFormError((err as Error).message) },
      );
    }
  }

  function handleDelete(p: Pipeline) {
    if (!confirm(`Delete pipeline "${p.name}"?`)) return;
    deletePipeline.mutate(p.id);
  }

  function addSchemaField() {
    setForm({
      ...form,
      param_schema: [...form.param_schema, { key: "", label: "", type: "string" as const, required: false, placeholder: "" }],
    });
  }

  function removeSchemaField(idx: number) {
    setForm({
      ...form,
      param_schema: form.param_schema.filter((_, i) => i !== idx),
    });
  }

  function updateSchemaField(idx: number, field: string, value: string | boolean) {
    const updated = form.param_schema.map((f, i) =>
      i === idx ? { ...f, [field]: value } : f
    );
    setForm({ ...form, param_schema: updated });
  }

  const isSaving = createPipeline.isPending || updatePipeline.isPending;

  return (
    <div className="space-y-5 anim-fade-in-up">
      <PageHeader
        title="pipelines"
        subtitle="prompt-driven agents · composed from plugin tools"
        action={
          <Button variant="primary" iconLeft={<Plus size={13} />} onClick={openCreate}>
            new pipeline
          </Button>
        }
      />

      {isLoading ? (
        <Panel title="agents">
          <div className="text-[12px] text-[hsl(var(--muted))]">loading pipelines...</div>
        </Panel>
      ) : isError ? (
        <Panel title="error">
          <div className="text-[12px] text-[hsl(var(--danger))]">
            failed to load pipelines: {(error as Error).message}
          </div>
        </Panel>
      ) : pipelines?.length === 0 ? (
        <Panel title="agents">
          <EmptyState
            icon={Workflow}
            title="No pipelines yet"
            description="Pipelines are system prompts that orchestrate plugin tools and Claude Code. Create one to get started."
            action={
              <Button variant="primary" iconLeft={<Plus size={13} />} onClick={openCreate}>
                create pipeline
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {pipelines?.map((p, i) => (
            <div
              key={p.id}
              style={{ ["--i" as string]: i }}
              className="anim-fade-in-up"
            >
              <PipelineCard
                pipeline={p}
                expanded={expandedCard === p.id}
                onToggle={() => setExpandedCard(expandedCard === p.id ? null : p.id)}
                onRun={() => openRun(p)}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={dialogMode === "create" || dialogMode === "edit"}
        onClose={closeDialog}
        title={dialogMode === "create" ? "Create pipeline" : `Edit · ${activePipeline?.name}`}
        subtitle={dialogMode === "edit" ? "prompt-driven agent" : "define a new prompt-driven agent"}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog}>
              cancel
            </Button>
            <Button
              variant="primary"
              loading={isSaving}
              onClick={dialogMode === "create" ? handleSaveCreate : handleSaveEdit}
            >
              {dialogMode === "create" ? "create pipeline" : "save changes"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-[1fr_1.4fr] gap-4 min-h-[480px]">
          {/* Left: metadata */}
          <div className="space-y-3.5">
            <div>
              <Label htmlFor="pipe-name">name</Label>
              <Input
                id="pipe-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. jira_to_pr_agent"
                disabled={dialogMode === "edit" && activePipeline?.is_builtin}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="pipe-desc">description</Label>
              <Input
                id="pipe-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="one-line summary of what this agent does"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>parameters</Label>
              <div className="mt-1.5 space-y-2">
                {form.param_schema.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)] space-y-1.5"
                  >
                    <div className="flex gap-1.5">
                      <Input
                        value={field.key}
                        onChange={(e) => updateSchemaField(idx, "key", e.target.value)}
                        placeholder="key"
                        className="flex-1"
                      />
                      <Input
                        value={field.label}
                        onChange={(e) => updateSchemaField(idx, "label", e.target.value)}
                        placeholder="label"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <Input
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateSchemaField(idx, "placeholder", e.target.value)}
                        placeholder="placeholder text"
                        className="flex-1"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted))] whitespace-nowrap cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateSchemaField(idx, "required", e.target.checked)}
                          className="accent-[hsl(var(--accent))]"
                        />
                        required
                      </label>
                      <button
                        onClick={() => removeSchemaField(idx)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[hsl(var(--subtle))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)] transition-colors"
                        aria-label="Remove parameter"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" iconLeft={<Plus size={11} />} onClick={addSchemaField}>
                  add parameter
                </Button>
              </div>
            </div>

            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer list-none">
                <ChevronRight size={11} className="text-[hsl(var(--subtle))] transition-transform group-open:rotate-90" />
                <Label className="cursor-pointer">default values (json)</Label>
              </summary>
              <Textarea
                id="pipe-params"
                value={form.default_params}
                onChange={(e) => setForm({ ...form, default_params: e.target.value })}
                rows={4}
                className="mt-1.5 font-[var(--font-mono)]"
                spellCheck={false}
              />
            </details>

            {tools && tools.length > 0 && (
              <div>
                <Label>available tools · {tools.length}</Label>
                <div className="mt-1.5 border border-[hsl(var(--border))] rounded-[var(--radius-sm)] max-h-40 overflow-y-auto p-2 space-y-1">
                  {tools.map((t) => (
                    <div key={t.name} className="text-[11px] leading-relaxed">
                      <span className="text-[hsl(var(--accent))] font-semibold">
                        {t.name}
                      </span>
                      <span className="text-[hsl(var(--muted))]"> — {t.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: system prompt editor */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <Label htmlFor="pipe-prompt">system prompt</Label>
              <span className="text-[10px] text-[hsl(var(--subtle))]">
                reference tools as <code className="text-[hsl(var(--accent))]">plugin__action</code>
              </span>
            </div>
            <Textarea
              id="pipe-prompt"
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              className="mt-1.5 flex-1 min-h-[440px] font-[var(--font-mono)] text-[12px] leading-[1.65]"
              spellCheck={false}
              placeholder="You are an agent that..."
            />
          </div>
        </div>
        {formError && (
          <div className="mt-3 px-3 py-2 bg-[hsl(var(--danger-soft))] border border-[hsl(var(--danger)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--danger))]">
            {formError}
          </div>
        )}
      </Modal>

      {/* Run Modal */}
      <Modal
        open={dialogMode === "run"}
        onClose={closeDialog}
        title={`Run · ${activePipeline?.name ?? ""}`}
        subtitle={activePipeline?.description}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog}>
              cancel
            </Button>
            <Button
              variant="primary"
              iconLeft={<Play size={12} />}
              loading={runPipeline.isPending}
              onClick={handleRun}
            >
              dispatch
            </Button>
          </>
        }
      >
        {activePipeline?.system_prompt && (
          <details className="group mb-3 bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)]">
            <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer list-none">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[hsl(var(--muted))]">
                <ChevronRight
                  size={11}
                  className="transition-transform group-open:rotate-90"
                />
                system prompt
              </span>
              <CopyButton value={activePipeline.system_prompt} size="sm" />
            </summary>
            <pre className="px-3 pb-3 text-[11.5px] font-[var(--font-mono)] whitespace-pre-wrap text-[hsl(var(--muted))] border-t border-[hsl(var(--border))] pt-3 max-h-64 overflow-y-auto">
              {activePipeline.system_prompt}
            </pre>
          </details>
        )}
        {activePipeline?.param_schema && activePipeline.param_schema.length > 0 ? (
          <div className="space-y-3">
            {activePipeline.param_schema.map((field) => (
              <div key={field.key}>
                <Label htmlFor={`run-${field.key}`}>
                  {field.label}
                  {field.required && <span className="text-[hsl(var(--danger))] ml-0.5">*</span>}
                </Label>
                <Input
                  id={`run-${field.key}`}
                  value={schemaParams[field.key] ?? ""}
                  onChange={(e) => setSchemaParams({ ...schemaParams, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <Label htmlFor="run-params">params (json)</Label>
            <Textarea
              id="run-params"
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              rows={6}
              className="mt-1.5 font-[var(--font-mono)]"
              spellCheck={false}
            />
          </div>
        )}
        {formError && (
          <div className="mt-3 px-3 py-2 bg-[hsl(var(--danger-soft))] border border-[hsl(var(--danger)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--danger))]">
            {formError}
          </div>
        )}
      </Modal>
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
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
      {action}
    </div>
  );
}

function PipelineCard({
  pipeline,
  expanded,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: {
  pipeline: Pipeline;
  expanded: boolean;
  onToggle: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const toolsReferenced = useMemo(
    () => extractToolRefs(pipeline.system_prompt),
    [pipeline.system_prompt],
  );
  const canEdit = true;
  const canDelete = !pipeline.is_builtin;

  return (
    <Panel
      title={pipeline.name}
      actions={
        <>
          {pipeline.is_builtin && (
            <Badge variant="accent" upper>
              built-in
            </Badge>
          )}
        </>
      }
      className="h-full flex flex-col"
      contentClassName="flex-1 flex flex-col"
    >
      <p className="text-[12px] text-[hsl(var(--muted))] leading-relaxed min-h-[36px]">
        {pipeline.description || "no description"}
      </p>

      {toolsReferenced.length > 0 && (
        <div className="mt-3 flex items-start gap-2">
          <Wrench size={11} className="mt-0.5 text-[hsl(var(--subtle))] shrink-0" />
          <div className="flex flex-wrap gap-1">
            {toolsReferenced.map((t) => (
              <Badge key={t} variant="default" className="font-[var(--font-mono)]">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Play size={11} />}
          onClick={onRun}
        >
          run
        </Button>
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Edit3 size={11} />}
            onClick={onEdit}
          >
            edit
          </Button>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "inline-flex items-center gap-1 h-7 px-2 text-[11px] rounded-[var(--radius-sm)]",
            "text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-hover))]",
            "transition-colors",
          )}
        >
          <ChevronDown
            size={11}
            className={cn("transition-transform", expanded && "rotate-180")}
          />
          prompt
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] text-[hsl(var(--subtle))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)] transition-colors"
            aria-label="Delete pipeline"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {expanded && pipeline.system_prompt && (
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] anim-fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <Label>system prompt</Label>
            <CopyButton value={pipeline.system_prompt} size="sm" />
          </div>
          <pre className="text-[11px] font-[var(--font-mono)] whitespace-pre-wrap text-[hsl(var(--muted))] max-h-64 overflow-y-auto leading-relaxed bg-[hsl(var(--bg))] p-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--border))]">
            {pipeline.system_prompt}
          </pre>
        </div>
      )}
    </Panel>
  );
}
