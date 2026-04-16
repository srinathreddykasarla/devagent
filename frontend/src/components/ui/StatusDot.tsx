import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "running" | "info" | "muted";
export type StatusSize = "sm" | "md";

const toneColor: Record<StatusTone, string> = {
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--danger))",
  running: "hsl(var(--running))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted))",
};

const sizePx: Record<StatusSize, number> = {
  sm: 6,
  md: 8,
};

interface StatusDotProps {
  tone: StatusTone;
  size?: StatusSize;
  pulse?: boolean;
  className?: string;
}

/**
 * Small colored dot used throughout the UI for status indication.
 * When `pulse` is true, shows an expanding ring animation for live/running state.
 */
export function StatusDot({ tone, size = "md", pulse, className }: StatusDotProps) {
  const px = sizePx[size];
  const color = toneColor[tone];
  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {pulse && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: color,
            animation: "pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
          }}
        />
      )}
      <span
        className={cn("rounded-full", pulse && "anim-pulse-dot")}
        style={{
          width: px,
          height: px,
          backgroundColor: color,
          boxShadow: pulse ? `0 0 8px ${color}` : "none",
        }}
      />
    </span>
  );
}
