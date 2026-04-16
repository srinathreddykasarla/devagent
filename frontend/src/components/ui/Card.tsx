import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[var(--radius)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({
  children,
  className,
  actions,
}: {
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">{children}</div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  );
};

Card.Body = function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-3", className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-3 py-2 border-t border-[hsl(var(--border))] flex items-center gap-2", className)}>
      {children}
    </div>
  );
};
