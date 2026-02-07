/**
 * @file VerticalTabButton.tsx
 * @description Vertical tab button for side panels in SQL Lab.
 */

import { cn } from "@/lib/utils";

interface VerticalTabButtonProps {
  label: string;
  active: boolean;
  onClick?: () => void;
}

export function VerticalTabButton({
  label,
  active,
  onClick,
}: VerticalTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-1 text-[10px] font-black uppercase tracking-[0.2em] [writing-mode:vertical-lr] transition-all hover:bg-muted border-l-4",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-transparent text-muted-foreground/40",
      )}
    >
      {label}
    </button>
  );
}
