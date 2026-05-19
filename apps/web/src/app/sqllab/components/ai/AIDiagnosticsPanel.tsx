/**
 * @file AIDiagnosticsPanel.tsx
 * @description Compact local observability panel for AI retrieval traces in SQL Lab.
 */

import React from "react";
import { Activity, Database, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIDiagnosticsPanelProps {
  diagnostics: any;
  isLoading: boolean;
  isDark?: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export const AIDiagnosticsPanel = React.memo(({
  diagnostics,
  isLoading,
  isDark,
  onRefresh,
  onClose,
}: AIDiagnosticsPanelProps) => {
  const summary = diagnostics?.summary || {};
  const events = diagnostics?.events || [];

  return (
    <div className={cn(
      "border-b border-border/70 px-4 py-3",
      isDark ? "bg-card/70" : "bg-muted/20",
    )}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              AI Trace
            </p>
            <p className="truncate text-[11px] text-muted-foreground/80">
              {summary.eventCount || 0} events, avg {summary.avgLatencyMs || 0} ms
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <TraceStat label="Max" value={`${summary.maxLatencyMs || 0}ms`} />
        <TraceStat label="Chunks" value={summary.avgSelectedCount || 0} />
        <TraceStat label="Fallback" value={summary.fallbackCount || 0} />
      </div>

      <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
        {events.slice(0, 5).map((event: any) => (
          <div key={event.id} className="rounded-md border border-border/70 bg-background/70 p-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-foreground">{event.retrievalMode}</span>
              <span className="tabular-nums text-muted-foreground">{event.latencyMs}ms</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(event.items || []).slice(0, 3).map((item: any, index: number) => (
                <span
                  key={`${event.id}-${item.citation || index}`}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  title={item.citation}
                >
                  <Database className="h-2.5 w-2.5" />
                  <span className="truncate">{item.title || item.sourceType}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && events.length === 0 && (
          <p className="py-4 text-center text-[12px] text-muted-foreground">No retrieval traces yet.</p>
        )}
      </div>
    </div>
  );
});

AIDiagnosticsPanel.displayName = "AIDiagnosticsPanel";

function TraceStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 px-2 py-1.5">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
