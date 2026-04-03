import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTask, useUpdateTask, useDeleteTask, useTriggerTask } from "@/hooks/useApi";

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading, isError, error } = useTask(taskId ?? "");
  const updateTask = useUpdateTask(taskId ?? "");
  const deleteTask = useDeleteTask();
  const triggerTask = useTriggerTask();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    pipeline: "",
    trigger_type: "manual" as string,
    params: "{}",
    enabled: true,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        pipeline: task.pipeline,
        trigger_type: task.trigger_type,
        params: JSON.stringify(task.params, null, 2),
        enabled: task.enabled,
      });
    }
  }, [task]);

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(formData.params) as Record<string, unknown>;
    } catch {
      alert("Invalid JSON in params field.");
      return;
    }
    updateTask.mutate(
      {
        name: formData.name,
        pipeline: formData.pipeline,
        trigger_type: formData.trigger_type,
        params: parsedParams,
        enabled: formData.enabled,
      },
      {
        onSuccess: () => setEditing(false),
      }
    );
  }

  function handleDelete() {
    if (!taskId) return;
    if (window.confirm("Delete this task? This cannot be undone.")) {
      deleteTask.mutate(taskId, {
        onSuccess: () => navigate("/tasks"),
      });
    }
  }

  function handleTrigger() {
    if (!taskId) return;
    triggerTask.mutate(taskId);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading task...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600">
        Failed to load task: {(error as Error).message}
      </p>
    );
  }

  if (!task) {
    return <p className="text-sm text-muted-foreground">Task not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{task.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleTrigger}
            disabled={triggerTask.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {triggerTask.isPending ? "Triggering..." : "Trigger"}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteTask.isPending}
            className="rounded-md px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {triggerTask.isSuccess && (
        <p className="text-sm text-green-600">Task triggered successfully. Check Runs for progress.</p>
      )}
      {triggerTask.isError && (
        <p className="text-sm text-red-600">
          Failed to trigger: {(triggerTask.error as Error).message}
        </p>
      )}

      {editing ? (
        <form
          onSubmit={handleUpdate}
          className="rounded-lg border border-border bg-card p-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Pipeline
            </label>
            <input
              type="text"
              required
              value={formData.pipeline}
              onChange={(e) => setFormData({ ...formData, pipeline: e.target.value })}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Trigger Type
            </label>
            <select
              value={formData.trigger_type}
              onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="manual">Manual</option>
              <option value="cron">Cron</option>
              <option value="webhook">Webhook</option>
              <option value="event">Event</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Params (JSON)
            </label>
            <textarea
              value={formData.params}
              onChange={(e) => setFormData({ ...formData, params: e.target.value })}
              rows={6}
              className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-input"
              />
              Enabled
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateTask.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {updateTask.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {updateTask.isError && (
            <p className="text-sm text-red-600">
              Failed to update: {(updateTask.error as Error).message}
            </p>
          )}
        </form>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">ID</span>
              <p className="font-mono text-xs">{task.id}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Pipeline</span>
              <p>{task.pipeline}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trigger Type</span>
              <p>{task.trigger_type}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Enabled</span>
              <p>{task.enabled ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Created</span>
              <p className="text-xs">{new Date(task.created_at).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Updated</span>
              <p className="text-xs">{new Date(task.updated_at).toLocaleString()}</p>
            </div>
          </div>
          {task.trigger_config && Object.keys(task.trigger_config).length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Trigger Config</span>
              <pre className="mt-1 rounded-md bg-secondary p-2 text-xs font-mono overflow-auto">
                {JSON.stringify(task.trigger_config, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Params</span>
            <pre className="mt-1 rounded-md bg-secondary p-2 text-xs font-mono overflow-auto">
              {JSON.stringify(task.params, null, 2)}
            </pre>
          </div>
          {task.notify_on.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Notify On</span>
              <div className="flex gap-1.5 mt-1">
                {task.notify_on.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
