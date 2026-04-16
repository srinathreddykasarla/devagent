import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium tracking-tight rounded-[var(--radius-sm)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none whitespace-nowrap";

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[11px]",
  md: "h-9 px-3.5 text-[12px]",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[hsl(var(--accent))] text-[hsl(var(--accent-fg))] hover:bg-[hsl(var(--accent-hover))]",
  secondary:
    "bg-[hsl(var(--surface-raised))] text-[hsl(var(--fg))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-hover))]",
  ghost:
    "bg-transparent text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-hover))] hover:text-[hsl(var(--fg))]",
  outline:
    "bg-transparent text-[hsl(var(--fg))] border border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--surface-hover))]",
  danger:
    "bg-transparent text-[hsl(var(--danger))] border border-[hsl(var(--danger))/0.4] hover:bg-[hsl(var(--danger)/0.12)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", iconLeft, iconRight, loading, children, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="anim-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
