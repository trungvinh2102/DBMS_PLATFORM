/**
 * @file ToolbarButton.tsx
 * @description Reusable toolbar button for the SQL Lab.
 */

import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

export function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      className={cn(
        "flex flex-col items-center justify-center p-2 min-w-13.75 h-11 rounded transition-all group border border-transparent shrink-0",
        disabled
          ? "opacity-20 cursor-not-allowed"
          : "hover:bg-muted cursor-pointer active:scale-95",
        active ? "bg-muted shadow-inner border-border/50" : "",
        className,
      )}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="mb-1 group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-tight whitespace-nowrap opacity-70 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
