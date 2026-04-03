# DevAgent REST API Reference

Base URL: `http://localhost:8000`

## Health

### GET /api/health
Returns server health status.

**Response:** `{"status": "ok"}`

## Tasks

### GET /api/tasks/
List all task definitions.

**Response:** `[{id, name, pipeline, trigger_type, trigger_config, params, enabled, notify_on, created_at, updated_at}]`

### POST /api/tasks/
Create a new task definition.

**Body:**
```json
{
  "name": "My Task",
  "pipeline": "jira_to_pr",
  "trigger_type": "manual",
  "params": {"ticket_id": "PROJ-123"},
  "enabled": true,
  "notify_on": ["failure"]
}
```

### GET /api/tasks/{task_id}
Get a single task definition.

### PUT /api/tasks/{task_id}
Update a task definition. Only include fields to update.

### DELETE /api/tasks/{task_id}
Delete a task definition.

### POST /api/tasks/{task_id}/trigger
Manually trigger a task run.

## Runs

### GET /api/runs/
List task runs. Optional query parameter `task_id` to filter.

**Response:** `[{id, task_id, status, started_at, finished_at, logs, result, error, retry_count}]`

### GET /api/runs/{run_id}
Get a single run with full logs and result.

## Plugins

### GET /api/plugins/
List all enabled plugins with health status.

**Response:** `[{name, healthy, message, capabilities}]`

## Pipelines

### GET /api/pipelines/
List available pipelines.

**Response:** `[{id, name, description}]`

### POST /api/pipelines/{pipeline_id}/run
Execute a pipeline.

**Body:**
```json
{
  "params": {"ticket_id": "PROJ-123"}
}
```

## WebSocket

### WS /ws/logs/{run_id}
Stream live logs for a pipeline run.

**Messages received:**
```json
{"timestamp": "2026-04-03T...", "level": "info", "message": "Starting pipeline..."}
```
