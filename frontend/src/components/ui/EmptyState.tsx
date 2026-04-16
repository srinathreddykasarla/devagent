import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 gap-2" : "py-16 gap-3",
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[hsl(var(--accent)/0.08)] blur-xl" />
        <Icon
          size={compact ? 28 : 40}
          strokeWidth={1.25}
          className="relative text-[hsl(var(--muted))]"
        />
      </div>
      <h3
        className={cn(
          "font-medium text-[hsl(var(--fg))]",
          compact ? "text-[12px]" : "text-[13px]",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-[hsl(var(--muted))] max-w-sm",
            compact ? "text-[11px]" : "text-[12px]",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
