/**
 * @file WorkspacePanelShared.tsx
 * @description Shared layout primitives for SQL Lab workspace side panels.
 */

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PanelHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action: () => void;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
      <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={action}
        aria-label={`Refresh ${title}`}
        title="Refresh"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  const title = typeof value === "string" || typeof value === "number" ? String(value) : undefined;

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="shrink-0">{label}</span>
      <span title={title} className="min-w-0 truncate text-right font-mono text-foreground">
        {value}
      </span>
    </div>
  );
}

export function ChangeMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-mono", className)}>
      <span>{label}</span>
      <span>{value}</span>
    </Badge>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-border/70 px-3 py-8 text-center">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
