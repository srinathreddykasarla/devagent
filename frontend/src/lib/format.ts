/**
 * Formatting helpers for the Mission Control UI.
 */

/** Short 8-char ID with monospace-friendly zero-padding guarantee. */
export function shortId(id: string, len = 8): string {
  return id.slice(0, len);
}

/**
 * Duration between two ISO timestamps (or from start to now if end is null).
 * Returns `mm:ss` under an hour, `h:mm:ss` above, `1.4s` / `245ms` for sub-minute.
 */
export function formatDuration(startedAt: string, finishedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const minutes = Math.floor(s / 60);
  const seconds = Math.floor(s % 60);
  if (minutes < 60) {
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  const hours = Math.floor(minutes / 60);
  const mm = (minutes % 60).toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return `${hours}:${mm}:${ss}`;
}

/** Relative time from an ISO timestamp, e.g. "3s ago", "12m ago", "4h ago". */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const s = Math.floor((now - then) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** HH:MM:SS from an ISO timestamp — for log rows. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** HH:MM:SS.mmm for log rows with millisecond precision. */
export function formatTimeMs(iso: string): string {
  const d = new Date(iso);
  const base = formatTime(iso);
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${base}.${ms}`;
}

/**
 * Extract plugin__action tool references from a system prompt.
 * Returns a deduplicated, sorted list.
 */
export function extractToolRefs(prompt: string): string[] {
  if (!prompt) return [];
  const matches = prompt.match(/\b[a-z][a-z0-9_]*__[a-z][a-z0-9_]*\b/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase()))).sort();
}
