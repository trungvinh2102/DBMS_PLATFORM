/**
 * @file AIDiagnosticsPanel.tsx
 * @description Compact local observability panel for AI retrieval traces in SQL Lab.
 */

import React from "react";
import { Activity, Clock3, Database, GitBranch, Loader2, RefreshCw, SearchCheck, ShieldAlert, X } from "lucide-react";
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
  const latestEvent = events[0];

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
              AI Diagnostics
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              How the assistant finds context before answering.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onPlan && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onPlan} disabled={isPlanning} aria-label="Plan current RAG query">
              {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SearchCheck className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isLoading} aria-label="Refresh AI diagnostics">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close AI diagnostics">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center md:grid-cols-4">
        <TraceStat label="Recent lookups" value={summary.eventCount || 0} />
        <TraceStat label="Avg latency" value={`${summary.avgLatencyMs || 0}ms`} />
        <TraceStat label="Context used" value={summary.avgSelectedCount || 0} />
        <TraceStat label="Fallbacks" value={summary.fallbackCount || 0} tone={summary.fallbackCount ? "warn" : "ok"} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-md border border-border/80 bg-background/95 p-2 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-md dark:shadow-black/35">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <GitBranch className="h-3 w-3 text-primary" />
              Retrieval pipeline
            </div>
            <span className={cn(
              "rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest",
              pipelineStatus?.enabled ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" : "border-amber-500/20 bg-amber-500/5 text-amber-600",
            )}>
              {pipelineStatus?.enabled ? "On" : "Off"}
            </span>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            Checks whether local RAG is ready to search schema, saved queries, history, and documents before the answer is generated.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              {stages.length || 0} stages configured
            </span>
            {pipelineStatus?.vectorStore?.backend && (
              <span className="rounded border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                {pipelineStatus.vectorStore.backend}
              </span>
            )}
            {latestEvent?.retrievalMode && (
              <span className="rounded border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                latest: {retrievalModeLabel(latestEvent.retrievalMode)}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border/80 bg-background/95 p-2 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-md dark:shadow-black/35">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <SearchCheck className="h-3 w-3 text-primary" />
            Current prompt plan
          </div>
          {understanding ? (
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Intent</span>
                <span className="truncate font-semibold">{understanding.intent}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Behavior</span>
                <span className="truncate font-semibold">{understanding.behavior || "unknown"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Retrieval</span>
                <span className="font-semibold">{understanding.needsRetrieval ? "will use context" : "skipped"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Context candidates</span>
                <span className="font-semibold tabular-nums">{trace?.selectedCount || 0}/{trace?.candidateCount || 0}</span>
              </div>
            </div>
          ) : (
            <div className="flex min-h-20 flex-col items-center justify-center rounded border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-center">
              <p className="text-[11px] leading-5 text-muted-foreground">
                Plan the current prompt to see whether QurioDB will search schema or documents before responding.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Clock3 className="h-3 w-3 text-primary" />
            Recent context lookups
          </div>
          <span className="text-[10px] text-muted-foreground">Used for debugging answer quality</span>
        </div>
      </div>

      <div className="max-h-40 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {events.slice(0, 5).map((event: any) => (
          <div key={event.id} className="rounded-md border border-border/80 bg-background/95 p-2 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-md dark:shadow-black/35">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-semibold text-foreground">{retrievalModeLabel(event.retrievalMode)}</span>
                {event.fallbackReason && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/5 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                    <ShieldAlert className="h-2.5 w-2.5" />
                    fallback
                  </span>
                )}
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {event.selectedCount || 0}/{event.candidateCount || 0} context - {event.latencyMs}ms
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {eventSourceChips(event.items || []).slice(0, 4).map((item: any, index: number) => (
                <span
                  key={`${event.id}-${item.label}-${index}`}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground/80 dark:border-white/10 dark:bg-white/[0.055]"
                  title={item.title}
                >
                  <Database className="h-2.5 w-2.5 text-primary" />
                  <span className="truncate">{item.label}</span>
                  {item.count > 1 && <span className="text-muted-foreground">x{item.count}</span>}
                </span>
              ))}
              {(!event.items || event.items.length === 0) && (
                <span className="text-[10px] text-muted-foreground">No context selected.</span>
              )}
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

function TraceStat({ label, value, tone = "neutral" }: { label: string; value: React.ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  return (
    <div className="rounded-md border border-border/80 bg-background/95 px-2 py-1.5 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-md dark:shadow-black/35">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-0.5 text-xs font-semibold tabular-nums",
        tone === "ok" && "text-emerald-600",
        tone === "warn" && "text-amber-600",
        tone === "neutral" && "text-foreground",
      )}>{value}</div>
    </div>
  );
}

function retrievalModeLabel(mode: string) {
  switch (mode) {
    case "hybrid":
      return "Hybrid context search";
    case "lexical_fallback":
      return "Keyword fallback search";
    case "empty":
      return "No context found";
    case "disabled":
      return "Retrieval disabled";
    default:
      return mode || "Unknown retrieval";
  }
}

function eventSourceChips(items: any[]) {
  const grouped = new Map<string, { label: string; title: string; count: number }>();

  for (const item of items) {
    const label = eventSourceLabel(item);
    const key = `${item.sourceType || "source"}:${label}`;
    const current = grouped.get(key);
    if (current) {
      current.count += 1;
    } else {
      grouped.set(key, {
        label,
        title: [
          item.title || item.sourceType || "source",
          item.score !== undefined ? `Retrieval relevance: ${Number(item.score).toFixed(4)}` : "",
          item.matchedTerms?.length ? `Matched: ${item.matchedTerms.join(", ")}` : "",
        ].filter(Boolean).join("\n"),
        count: 1,
      });
    }
  }

  return Array.from(grouped.values());
}

function eventSourceLabel(item: any) {
  if (item.sourceType === "database_schema" && /^\w+\s+schema$/i.test(String(item.title || ""))) {
    return "Schema context";
  }
  if (item.title) return item.title;
  if (item.sourceType === "saved_query") return "Saved query";
  if (item.sourceType === "query_history") return "Query history";
  if (item.sourceType === "document") return "Document";
  return "Context source";
}
