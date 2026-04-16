import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeMs } from "@/lib/format";
import type { LogEntry } from "@/lib/types";
import { Input } from "./Input";
import { Button } from "./Button";

export interface LogStreamProps {
  entries: LogEntry[];
  /** If true, shows a pulsing "LIVE" indicator in the header */
  live?: boolean;
  className?: string;
  /** Height of the scrollable area */
  height?: string | number;
}

const LEVELS = ["all", "info", "warning", "error", "debug"] as const;
type LevelFilter = (typeof LEVELS)[number];

const levelClass: Record<string, string> = {
  info:    "text-[hsl(var(--muted))]",
  warning: "text-[hsl(var(--warning))]",
  error:   "text-[hsl(var(--danger))]",
  debug:   "text-[hsl(var(--subtle))]",
  tool:    "text-[hsl(var(--running))]",
};

const levelLabel: Record<string, string> = {
  info: "INFO",
  warning: "WARN",
  error: "ERR ",
  debug: "DBUG",
  tool: "TOOL",
};

export function LogStream({ entries, live, className, height = "100%" }: LogStreamProps) {
  const [filter, setFilter] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.level.toLowerCase() !== filter) return false;
      if (q && !e.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, filter, query]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length, autoScroll]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  }

  function jumpToBottom() {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden",
        className,
      )}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <div className="relative flex-1 min-w-0">
          <Search
            size={11}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[hsl(var(--subtle))]"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter logs..."
            className="pl-7 h-7 text-[11.5px]"
          />
        </div>
        <div className="flex items-center gap-0.5">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={cn(
                "px-2 h-7 text-[10px] uppercase tracking-[0.08em] rounded-[var(--radius-sm)] transition-colors",
                filter === lvl
                  ? "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]"
                  : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-hover))]",
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
        {live && (
          <span className="flex items-center gap-1.5 pl-1.5 pr-2 h-7 text-[10px] uppercase tracking-[0.1em] text-[hsl(var(--running))]">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--running))] anim-pulse-dot" />
            live
          </span>
        )}
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-[var(--font-mono)] text-[11.5px] leading-[1.6]"
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[hsl(var(--subtle))] text-[11px]">
            {entries.length === 0 ? "no log entries yet" : "no matches for current filter"}
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((entry, i) => (
              <LogRow
                key={`${entry.timestamp}-${i}`}
                entry={entry}
                // Animate only the last few to avoid heavy re-animation on filter change
                animate={i >= filtered.length - 3}
              />
            ))}
          </div>
        )}
      </div>

      {!autoScroll && (
        <div className="absolute bottom-3 right-3">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<ArrowDownToLine size={12} />}
            onClick={jumpToBottom}
          >
            latest
          </Button>
        </div>
      )}
    </div>
  );
}

function LogRow({ entry, animate }: { entry: LogEntry; animate?: boolean }) {
  const lvl = entry.level.toLowerCase();
  return (
    <div
      className={cn(
        "grid grid-cols-[84px_44px_1fr] gap-2 px-2.5 py-0.5 hover:bg-[hsl(var(--surface-hover))]",
        animate && "anim-slide-in-up",
      )}
    >
      <span className="text-[hsl(var(--subtle))] text-[11px] tabular-nums">
        {formatTimeMs(entry.timestamp)}
      </span>
      <span className={cn("text-[10px] font-semibold uppercase tracking-[0.06em]", levelClass[lvl] ?? "text-[hsl(var(--muted))]")}>
        {levelLabel[lvl] ?? lvl.toUpperCase().padEnd(4)}
      </span>
      <span className="whitespace-pre-wrap break-words text-[hsl(var(--fg))]">
        {entry.message}
      </span>
    </div>
  );
}
