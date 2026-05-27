/**
 * @file ExplainPlanGraph.tsx
 * @description Presentational pieces for graphical execution plan rendering and inspection.
 */

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps, type NodeTypes } from "@xyflow/react";
import ReactMarkdown from "react-markdown";
import { AlertTriangle, Bot, Database, FileJson, GitBranch, Loader2, Maximize2, Search, Sparkles, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlanGraphNode } from "./explain-plan-types";

export const nodeTypes = {
  planNode: memo(PlanNode),
} satisfies NodeTypes;

export function PlanNode({ data }: NodeProps<Node<PlanGraphNode>>) {
  const warnings = data.warnings || [];
  const details = data.details || {};
  const isScan = /scan/i.test(data.operation || "");
  const isIndex = /index|search/i.test(data.operation || "");
  const isJoin = /join|loop/i.test(data.operation || "");
  const Icon = isIndex ? Zap : isJoin ? GitBranch : isScan ? Search : Database;

  return (
    <div className={cn("w-[230px] rounded-lg border bg-background shadow-sm", warnings.length ? "border-amber-500/40 shadow-amber-500/10" : "border-border/60")}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-start gap-3 p-3">
        <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", warnings.length ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-primary/20 bg-primary/10 text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold">{data.operation || "Plan Node"}</div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">{data.relation || data.label}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {metric("Cost", details.totalCost)}
            {metric("Rows", details.planRows || details.actualRows || details.rowsExaminedPerScan)}
            {metric("Time", details.actualTotalTime ? `${details.actualTotalTime}ms` : undefined)}
          </div>
        </div>
      </div>
      {warnings.length ? (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
          {warnings.join(", ")}
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex h-8 items-center gap-2 rounded-md px-3 text-[10px] font-black uppercase tracking-widest transition", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function PlanSummary({ summary, nodes }: { summary: Record<string, any>; nodes: PlanGraphNode[] }) {
  const warnings = nodes.filter((node) => node.warnings?.length);
  const operations = Object.entries(summary?.operations || {});

  return (
    <aside className="overflow-y-auto border-l border-border/60 bg-muted/10 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Summary</div>
      <div className="grid grid-cols-2 gap-2">
        <SummaryTile label="Nodes" value={summary?.nodeCount ?? nodes.length} />
        <SummaryTile label="Edges" value={summary?.edgeCount ?? 0} />
        <SummaryTile label="Warnings" value={summary?.warningCount ?? warnings.length} tone="warning" />
        <SummaryTile label="Dialect" value={summary?.dialect || "SQL"} />
      </div>
      <div className="mt-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operations</div>
      <div className="mt-2 space-y-2">
        {operations.length ? operations.map(([name, count]) => (
          <div key={name} className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 px-3 py-2 text-xs">
            <span className="truncate font-semibold">{name}</span>
            <span className="font-black text-primary">{String(count)}</span>
          </div>
        )) : <div className="text-sm text-muted-foreground">No operation summary.</div>}
      </div>
      {warnings.length ? <Bottlenecks nodes={warnings} /> : null}
    </aside>
  );
}

export function AIExplanation({ explanation, isLoading, onExplain, canExplain }: { explanation?: string; isLoading: boolean; onExplain: () => void; canExplain: boolean }) {
  if (isLoading) {
    return <Centered icon={<Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />} text="Analyzing plan..." />;
  }
  if (!explanation) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Bot className="mb-4 h-10 w-10 text-muted-foreground/40" />
        <div className="text-sm font-bold">AI explanation is ready on demand.</div>
        <button type="button" onClick={onExplain} disabled={!canExplain} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
          <Sparkles className="h-4 w-4" />
          Explain Plan
        </button>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    </div>
  );
}

export function RawPlan({ planData, dialect }: { planData: any; dialect: string }) {
  return (
    <div className="h-full overflow-auto bg-muted/5 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <FileJson className="h-4 w-4" />
        Raw Plan ({dialect})
      </div>
      <pre className="rounded-md border border-border/60 bg-background/70 p-4 text-[11px] leading-relaxed">
        {typeof planData === "string" ? planData : JSON.stringify(planData, null, 2)}
      </pre>
    </div>
  );
}

export function EmptyGraph() {
  return <Centered icon={<Maximize2 className="mb-4 h-8 w-8 opacity-30" />} text="No graphable plan nodes" />;
}

function Bottlenecks({ nodes }: { nodes: PlanGraphNode[] }) {
  return (
    <>
      <div className="mt-5 text-[10px] font-black uppercase tracking-widest text-amber-500">Bottlenecks</div>
      <div className="mt-2 space-y-2">
        {nodes.map((node) => (
          <div key={node.id} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="truncate">{node.operation}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{node.warnings?.join(", ")}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: any; tone?: "warning" }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/70 p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate text-lg font-black", tone === "warning" ? "text-amber-500" : "text-foreground")}>{String(value)}</div>
    </div>
  );
}

function Centered({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
      {icon}
      <div className="text-[11px] font-black uppercase tracking-widest">{text}</div>
    </div>
  );
}

function metric(label: string, value: any) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
      {label}: <span className="text-foreground">{String(value)}</span>
    </span>
  );
}
