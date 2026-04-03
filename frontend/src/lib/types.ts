export interface Task {
  id: string;
  name: string;
  pipeline: string;
  trigger_type: "cron" | "webhook" | "manual" | "event";
  trigger_config: Record<string, unknown>;
  params: Record<string, unknown>;
  enabled: boolean;
  notify_on: string[];
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  task_id: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  started_at: string;
  finished_at: string | null;
  logs: LogEntry[];
  result: Record<string, unknown> | null;
  error: string | null;
  retry_count: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface Plugin {
  name: string;
  healthy: boolean;
  message: string;
  capabilities: string[];
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
}
