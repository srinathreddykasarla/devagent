import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Remove body padding (used when content is a table or custom grid) */
  bleed?: boolean;
}

/**
 * A titled container used across Mission Control pages.
 * Header uses uppercase monospace label with letter-spacing.
 */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
  bleed,
}: PanelProps) {
  return (
    <section
      className={cn(
        "bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-[hsl(var(--border))]">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--fg-strong))]">
            {title}
          </h2>
          {subtitle && (
            <span className="text-[11px] text-[hsl(var(--muted))] truncate">{subtitle}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </header>
      <div className={cn(!bleed && "p-3.5", contentClassName)}>{children}</div>
    </section>
  );
}
