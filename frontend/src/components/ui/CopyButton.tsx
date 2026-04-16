import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonSize } from "./Button";

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: ButtonSize;
}

export function CopyButton({ value, label, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleClick() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      iconLeft={copied ? <Check size={12} /> : <Copy size={12} />}
      aria-label={label ?? "Copy"}
    >
      {label ? (copied ? "copied" : label) : null}
    </Button>
  );
}
