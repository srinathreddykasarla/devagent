import { useState } from "react";
import { Link } from "react-router-dom";
import { useTasks, useCreateTask, useDeleteTask } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

export default function Tasks() {
  const { data: tasks, isLoading, isError, error } = useTasks();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    pipeline: string;
    trigger_type: "manual" | "cron" | "webhook" | "event";
    enabled: boolean;
  }>({
    name: "",
    pipeline: "",
    trigger_type: "manual",
    enabled: true,
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createTask.mutate(formData, {
      onSuccess: () => {
        setShowForm(false);
        setFormData({ name: "", pipeline: "", trigger_type: "manual" as const, enabled: true });
      },
    });
  }

  function handleDelete(id: string) {
    if (window.confirm("Delete this task?")) {
      deleteTask.mutate(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Manage scheduled task definitions.</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showForm ? "Cancel" : "New Task"}
        </button>
      </div>

      {/* Create Task Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-border bg-card p-4 space-y-4"
        >
          <h3 className="text-sm font-medium">Create Task</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Task name"
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
                className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Pipeline ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Trigger Type
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trigger_type: e.target.value as "manual" | "cron" | "webhook" | "event",
                  })
                }
                className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="manual">Manual</option>
                <option value="cron">Cron</option>
                <option value="webhook">Webhook</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div className="flex items-end">
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
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createTask.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createTask.isPending ? "Creating..." : "Create"}
            </button>
          </div>
          {createTask.isError && (
            <p className="text-sm text-red-600">
              Failed to create task: {(createTask.error as Error).message}
            </p>
          )}
        </form>
      )}

      {/* Tasks Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Failed to load tasks: {(error as Error).message}
        </p>
      ) : tasks?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks defined yet.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Pipeline</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Trigger</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Enabled</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="font-medium hover:underline"
                    >
                      {task.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{task.pipeline}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {task.trigger_type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        task.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {task.enabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={deleteTask.isPending}
                      className="rounded-md px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
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
