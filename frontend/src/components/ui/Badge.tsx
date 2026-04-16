import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StatusDot, type StatusTone } from "./StatusDot";

export type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "running" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  /** Shows a leading status dot */
  dot?: boolean;
  /** Pulse the dot (implies dot) */
  pulse?: boolean;
  /** Uppercase the text */
  upper?: boolean;
}

const variants: Record<BadgeVariant, { bg: string; fg: string; border: string; tone: StatusTone }> = {
  default: {
    bg: "bg-[hsl(var(--surface-raised))]",
    fg: "text-[hsl(var(--muted))]",
    border: "border-[hsl(var(--border))]",
    tone: "muted",
  },
  accent: {
    bg: "bg-[hsl(var(--accent)/0.12)]",
    fg: "text-[hsl(var(--accent))]",
    border: "border-[hsl(var(--accent)/0.35)]",
    tone: "warning",
  },
  success: {
    bg: "bg-[hsl(var(--success-soft))]",
    fg: "text-[hsl(var(--success))]",
    border: "border-[hsl(var(--success)/0.35)]",
    tone: "success",
  },
  warning: {
    bg: "bg-[hsl(var(--warning-soft))]",
    fg: "text-[hsl(var(--warning))]",
    border: "border-[hsl(var(--warning)/0.35)]",
    tone: "warning",
  },
  danger: {
    bg: "bg-[hsl(var(--danger-soft))]",
    fg: "text-[hsl(var(--danger))]",
    border: "border-[hsl(var(--danger)/0.35)]",
    tone: "danger",
  },
  running: {
    bg: "bg-[hsl(var(--running-soft))]",
    fg: "text-[hsl(var(--running))]",
    border: "border-[hsl(var(--running)/0.35)]",
    tone: "running",
  },
  outline: {
    bg: "bg-transparent",
    fg: "text-[hsl(var(--fg))]",
    border: "border-[hsl(var(--border-strong))]",
    tone: "muted",
  },
};

export function Badge({
  variant = "default",
  children,
  className,
  dot,
  pulse,
  upper,
}: BadgeProps) {
  const v = variants[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 h-[18px] text-[10px] font-medium rounded-[var(--radius-sm)] border tracking-tight",
        v.bg,
        v.fg,
        v.border,
        upper && "uppercase tracking-[0.08em]",
        className,
      )}
    >
      {(dot || pulse) && <StatusDot tone={v.tone} size="sm" pulse={pulse} />}
      {children}
    </span>
  );
}
