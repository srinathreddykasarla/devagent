import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Play, Save, Trash2 } from "lucide-react";
import {
  useDeleteTask,
  usePipelines,
  useTask,
  useTriggerTask,
  useUpdateTask,
} from "@/hooks/useApi";
import { formatRelativeTime } from "@/lib/format";
import {
  Badge,
  Button,
  Input,
  Label,
  Panel,
  Select,
  StatusDot,
  Textarea,
} from "@/components/ui";

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading, isError, error } = useTask(taskId ?? "");
  const { data: pipelines } = usePipelines();
  const updateTask = useUpdateTask(taskId ?? "");
  const deleteTask = useDeleteTask();
  const triggerTask = useTriggerTask();

  const [form, setForm] = useState({
    name: "",
    pipeline: "",
    trigger_type: "manual" as string,
    params: "{}",
    enabled: true,
  });
  const [paramsError, setParamsError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name,
        pipeline: task.pipeline,
        trigger_type: task.trigger_type,
        params: JSON.stringify(task.params, null, 2),
        enabled: task.enabled,
      });
    }
  }, [task]);

  function handleUpdate() {
    setParamsError(null);
    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(form.params) as Record<string, unknown>;
    } catch (e) {
      setParamsError(`invalid JSON: ${(e as Error).message}`);
      return;
    }
    updateTask.mutate({
      name: form.name,
      pipeline: form.pipeline,
      trigger_type: form.trigger_type,
      params: parsedParams,
      enabled: form.enabled,
    });
  }

  function handleDelete() {
    if (!taskId) return;
    if (window.confirm(`Delete task "${task?.name}"? This cannot be undone.`)) {
      deleteTask.mutate(taskId, { onSuccess: () => navigate("/tasks") });
    }
  }

  function handleTrigger() {
    if (!taskId) return;
    triggerTask.mutate(taskId);
  }

  if (isLoading) {
    return <div className="p-10 text-[12px] text-[hsl(var(--muted))]">loading task...</div>;
  }

  if (isError) {
    return (
      <div className="p-10 text-[12px] text-[hsl(var(--danger))]">
        failed to load: {(error as Error).message}
      </div>
    );
  }

  if (!task) {
    return <div className="p-10 text-[12px] text-[hsl(var(--muted))]">task not found</div>;
  }

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div className="flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-[hsl(var(--fg-strong))] truncate">
              {task.name}
            </h1>
            <Badge variant={task.enabled ? "success" : "default"} dot upper>
              {task.enabled ? "enabled" : "disabled"}
            </Badge>
          </div>
          <p className="mt-1 text-[11.5px] text-[hsl(var(--muted))]">
            {task.trigger_type} · {task.pipeline}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            iconLeft={<Play size={12} />}
            loading={triggerTask.isPending}
            onClick={handleTrigger}
          >
            trigger now
          </Button>
          <Button
            variant="danger"
            iconLeft={<Trash2 size={12} />}
            onClick={handleDelete}
            disabled={deleteTask.isPending}
          >
            delete
          </Button>
        </div>
      </div>

      {triggerTask.isSuccess && (
        <div className="px-3 py-2 bg-[hsl(var(--success-soft))] border border-[hsl(var(--success)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--success))]">
          → dispatched · check runs page for live progress
        </div>
      )}
      {triggerTask.isError && (
        <div className="px-3 py-2 bg-[hsl(var(--danger-soft))] border border-[hsl(var(--danger)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--danger))]">
          trigger failed: {(triggerTask.error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
        {/* Metadata */}
        <Panel title="metadata">
          <dl className="space-y-2.5 text-[11.5px]">
            <MetaRow label="id">
              <span className="font-[var(--font-mono)] text-[11px] break-all">
                {task.id}
              </span>
            </MetaRow>
            <MetaRow label="pipeline">
              <span className="font-[var(--font-mono)] text-[11px]">{task.pipeline}</span>
            </MetaRow>
            <MetaRow label="trigger">
              <Badge variant="default" upper>
                {task.trigger_type}
              </Badge>
            </MetaRow>
            <MetaRow label="status">
              <div className="flex items-center gap-1.5">
                <StatusDot tone={task.enabled ? "success" : "muted"} />
                <span>{task.enabled ? "enabled" : "disabled"}</span>
              </div>
            </MetaRow>
            <MetaRow label="created">
              <span title={new Date(task.created_at).toLocaleString()}>
                {formatRelativeTime(task.created_at)}
              </span>
            </MetaRow>
            <MetaRow label="updated">
              <span title={new Date(task.updated_at).toLocaleString()}>
                {formatRelativeTime(task.updated_at)}
              </span>
            </MetaRow>
            {task.notify_on.length > 0 && (
              <MetaRow label="notify">
                <div className="flex flex-wrap gap-1">
                  {task.notify_on.map((n) => (
                    <Badge key={n} variant="default">
                      {n}
                    </Badge>
                  ))}
                </div>
              </MetaRow>
            )}
          </dl>
        </Panel>

        {/* Editor */}
        <Panel
          title="configuration"
          actions={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Save size={11} />}
              loading={updateTask.isPending}
              onClick={handleUpdate}
            >
              save changes
            </Button>
          }
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <Label htmlFor="task-detail-name">name</Label>
                <Input
                  id="task-detail-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="task-detail-pipeline">pipeline</Label>
                <Select
                  id="task-detail-pipeline"
                  value={form.pipeline}
                  onChange={(e) => setForm({ ...form, pipeline: e.target.value })}
                  className="mt-1.5"
                >
                  <option value="">select...</option>
                  {pipelines?.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="task-detail-trigger">trigger type</Label>
                <Select
                  id="task-detail-trigger"
                  value={form.trigger_type}
                  onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                  className="mt-1.5"
                >
                  <option value="manual">manual</option>
                  <option value="cron">cron</option>
                  <option value="webhook">webhook</option>
                  <option value="event">event</option>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-[12px] text-[hsl(var(--fg))] cursor-pointer h-8">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="accent-[hsl(var(--accent))]"
                  />
                  enabled
                </label>
              </div>
            </div>

            {task.trigger_config && Object.keys(task.trigger_config).length > 0 && (
              <div>
                <Label>trigger config (read-only)</Label>
                <pre className="mt-1.5 text-[11px] font-[var(--font-mono)] whitespace-pre-wrap text-[hsl(var(--muted))] bg-[hsl(var(--bg))] p-2.5 rounded-[var(--radius-sm)] border border-[hsl(var(--border))] max-h-40 overflow-y-auto">
                  {JSON.stringify(task.trigger_config, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <Label htmlFor="task-detail-params">params (json)</Label>
              <Textarea
                id="task-detail-params"
                value={form.params}
                onChange={(e) => setForm({ ...form, params: e.target.value })}
                rows={8}
                className="mt-1.5 font-[var(--font-mono)]"
                spellCheck={false}
              />
              {paramsError && (
                <p className="mt-1.5 text-[11px] text-[hsl(var(--danger))]">{paramsError}</p>
              )}
            </div>

            {updateTask.isError && (
              <div className="px-3 py-2 bg-[hsl(var(--danger-soft))] border border-[hsl(var(--danger)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--danger))]">
                update failed: {(updateTask.error as Error).message}
              </div>
            )}
            {updateTask.isSuccess && (
              <div className="px-3 py-2 bg-[hsl(var(--success-soft))] border border-[hsl(var(--success)/0.35)] rounded-[var(--radius-sm)] text-[11.5px] text-[hsl(var(--success))]">
                saved
              </div>
            )}
          </div>
        </Panel>
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
