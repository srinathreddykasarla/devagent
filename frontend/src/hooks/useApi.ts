import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Task, Run, Plugin, Pipeline } from "@/lib/types";

export function useTasks() {
  return useQuery<Task[]>({ queryKey: ["tasks"], queryFn: api.tasks.list });
}

export function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
  });
}

export function useRuns() {
  return useQuery<Run[]>({ queryKey: ["runs"], queryFn: api.runs.list });
}

export function useRun(id: string) {
  return useQuery<Run>({
    queryKey: ["runs", id],
    queryFn: () => api.runs.get(id),
    enabled: !!id,
  });
}

export function usePlugins() {
  return useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: api.plugins.list,
  });
}

export function usePipelines() {
  return useQuery<Pipeline[]>({
    queryKey: ["pipelines"],
    queryFn: api.pipelines.list,
  });
}
