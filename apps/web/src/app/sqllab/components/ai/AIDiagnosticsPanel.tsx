/**
 * @file AIDiagnosticsPanel.tsx
 * @description Compact local observability panel for AI retrieval traces in SQL Lab.
 */

import React from "react";
import { Activity, Database, GitBranch, Loader2, RefreshCw, SearchCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIDiagnosticsPanelProps {
  diagnostics: any;
  pipelineStatus?: any;
  ragPlan?: any;
  isLoading: boolean;
  isPlanning?: boolean;
  isDark?: boolean;
  onPlan?: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const AIDiagnosticsPanel = React.memo(({
  diagnostics,
  pipelineStatus,
  ragPlan,
  isLoading,
  isPlanning,
  isDark,
  onPlan,
  onRefresh,
  onClose,
}: AIDiagnosticsPanelProps) => {
  const summary = diagnostics?.summary || {};
  const events = diagnostics?.events || [];
  const stages = pipelineStatus?.stages || [];
  const understanding = ragPlan?.understanding;
  const trace = ragPlan?.retrievalTrace;

  return (
    <div className={cn(
      "relative z-10 border-y border-border/80 px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10 dark:shadow-[0_-10px_28px_rgba(0,0,0,0.45),0_16px_40px_rgba(0,0,0,0.55)]",
      isDark ? "bg-[#101215]" : "bg-card/95 dark:bg-[#101215]",
    )}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 shadow-sm shadow-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-foreground">
              AI Trace
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {summary.eventCount || 0} events, avg {summary.avgLatencyMs || 0} ms
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onPlan && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onPlan} disabled={isPlanning} aria-label="Plan current RAG query">
              {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SearchCheck className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isLoading} aria-label="Refresh AI trace">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close AI trace">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <TraceStat label="Max" value={`${summary.maxLatencyMs || 0}ms`} />
        <TraceStat label="Chunks" value={summary.avgSelectedCount || 0} />
        <TraceStat label="Fallback" value={summary.fallbackCount || 0} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-md border border-border/80 bg-background/95 p-2 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-md dark:shadow-black/35">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <GitBranch className="h-3 w-3 text-primary" />
              Pipeline
            </div>
            <span className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest",
              pipelineStatus?.enabled ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" : "border-amber-500/20 bg-amber-500/5 text-amber-600",
            )}>
              {pipelineStatus?.enabled ? "On" : "Off"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {stages.slice(0, 16).map((stage: any, index: number) => (
              <span
                key={stage.key}
                className="h-5 rounded border border-border/70 bg-muted/30 text-center text-[9px] font-black leading-5 tabular-nums text-muted-foreground"
                title={stage.name}
              >
                {index + 1}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border/80 bg-background/95 p-2 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-md dark:shadow-black/35">
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">RAG Plan</div>
          {understanding ? (
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Intent</span>
                <span className="truncate font-semibold">{understanding.intent}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Retrieval</span>
                <span className="font-semibold">{understanding.needsRetrieval ? "needed" : "skipped"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Chunks</span>
                <span className="font-semibold tabular-nums">{trace?.selectedCount || 0}/{trace?.candidateCount || 0}</span>
              </div>
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] text-muted-foreground">No RAG plan yet.</p>
          )}
        </div>
      </div>

      <div className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1">
        {events.slice(0, 5).map((event: any) => (
          <div key={event.id} className="rounded-md border border-border/80 bg-background/95 p-2 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-md dark:shadow-black/35">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-foreground">{event.retrievalMode}</span>
              <span className="tabular-nums text-muted-foreground">{event.latencyMs}ms</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(event.items || []).slice(0, 3).map((item: any, index: number) => (
                <span
                  key={`${event.id}-${item.citation || index}`}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground/80 dark:border-white/10 dark:bg-white/[0.055]"
                  title={item.citation}
                >
                  <Database className="h-2.5 w-2.5 text-primary" />
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
    <div className="rounded-md border border-border/80 bg-background/95 px-2 py-1.5 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-md dark:shadow-black/35">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
