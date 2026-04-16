import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  /** Hide the close button in the header (ESC/overlay still work) */
  hideCloseButton?: boolean;
}

const widthClass = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "lg",
  children,
  footer,
  hideCloseButton,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-[hsl(var(--bg)/0.72)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full anim-modal-in",
          "bg-[hsl(var(--surface-raised))] border border-[hsl(var(--border-strong))] rounded-[var(--radius)]",
          "shadow-[0_20px_80px_-10px_rgba(0,0,0,0.6)]",
          "max-h-[92vh] flex flex-col overflow-hidden",
          widthClass[size],
        )}
      >
        {(title || subtitle || !hideCloseButton) && (
          <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
            <div className="min-w-0">
              {title && (
                <h2 className="text-[13px] font-semibold text-[hsl(var(--fg-strong))] truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-[11.5px] text-[hsl(var(--muted))] truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 px-0"
              >
                <X size={14} />
              </Button>
            )}
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[hsl(var(--border))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
