import type {
  Task,
  Run,
  Plugin,
  Pipeline,
  PipelineCreateInput,
  PipelineUpdateInput,
  Tool,
} from "./types";

const API_BASE = "/api";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  tasks: {
    list: () => fetchApi<Task[]>("/tasks/"),
    get: (id: string) => fetchApi<Task>(`/tasks/${id}`),
    create: (data: Record<string, unknown>) =>
      fetchApi<Task>("/tasks/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi<Task>(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/tasks/${id}`, { method: "DELETE" }),
    trigger: (id: string) =>
      fetchApi<Run>(`/tasks/${id}/trigger`, { method: "POST" }),
  },
  runs: {
    list: () => fetchApi<Run[]>("/runs/"),
    get: (id: string) => fetchApi<Run>(`/runs/${id}`),
  },
  plugins: {
    list: () => fetchApi<Plugin[]>("/plugins/"),
  },
  pipelines: {
    list: () => fetchApi<Pipeline[]>("/pipelines/"),
    get: (id: string) => fetchApi<Pipeline>(`/pipelines/${id}`),
    create: (data: PipelineCreateInput) =>
      fetchApi<Pipeline>("/pipelines/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: PipelineUpdateInput) =>
      fetchApi<Pipeline>(`/pipelines/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ deleted: string }>(`/pipelines/${id}`, { method: "DELETE" }),
    run: (id: string, params?: Record<string, unknown>) =>
      fetchApi<Run>(`/pipelines/${id}/run`, {
        method: "POST",
        body: JSON.stringify({ params: params ?? {} }),
      }),
  },
  tools: {
    list: () => fetchApi<Tool[]>("/tools/"),
  },
  health: () => fetchApi<{ status: string }>("/health"),
};
