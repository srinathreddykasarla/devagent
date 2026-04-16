import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted))]",
        className,
      )}
      {...rest}
    >
      {children}
    </label>
  );
}
