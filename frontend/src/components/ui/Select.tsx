import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full h-8 pl-2.5 pr-7 bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded-[var(--radius-sm)] text-[12.5px] text-[hsl(var(--fg))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none appearance-none cursor-pointer bg-no-repeat bg-[length:10px_10px] bg-[position:right_8px_center]";

// Inline SVG chevron as background
const chevron =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' fill='none' stroke='%23888' stroke-width='1.5'><path d='M2 4l3 3 3-3'/></svg>\")";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(base, className)}
        style={{ backgroundImage: chevron }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);
