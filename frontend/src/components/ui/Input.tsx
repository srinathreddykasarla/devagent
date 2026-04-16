import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full h-8 px-2.5 bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)] text-[12.5px] text-[hsl(var(--fg))] placeholder:text-[hsl(var(--subtle))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(base, className)} {...rest} />;
  },
);
