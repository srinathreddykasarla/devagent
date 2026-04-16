import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full px-2.5 py-2 bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)] text-[12.5px] text-[hsl(var(--fg))] placeholder:text-[hsl(var(--subtle))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none resize-y";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(base, className)} {...rest} />;
  },
);
