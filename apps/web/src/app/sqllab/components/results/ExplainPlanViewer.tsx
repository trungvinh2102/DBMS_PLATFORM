/**
 * @file ExplainPlanViewer.tsx
 * @description Graphical execution plan viewer with raw plan inspection and AI explanation.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, FileJson, GitBranch, Loader2, Sparkles } from "lucide-react";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { aiApi } from "@/lib/api-client";
import {
  AIExplanation,
  EmptyGraph,
  nodeTypes,
  PlanSummary,
  RawPlan,
  TabButton,
} from "./ExplainPlanGraph";
import type { PlanGraph, ViewerTab } from "./explain-plan-types";
import { layoutGraph, normalizeGraph } from "./explain-plan-utils";

interface ExplainPlanViewerProps {
  planData: any;
  dialect?: string;
  sql?: string;
  graph?: PlanGraph;
  summary?: Record<string, any>;
}

export function ExplainPlanViewer({
  planData,
  dialect = "sql",
  sql = "",
  graph,
  summary = {},
}: ExplainPlanViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewerTab>("graph");
  const normalizedGraph = useMemo(() => normalizeGraph(planData, dialect, graph), [dialect, graph, planData]);
  const flowGraph = useMemo(() => layoutGraph(normalizedGraph), [normalizedGraph]);
  const explainCacheKey = useMemo(
    () => JSON.stringify({ dialect, graph: normalizedGraph, plan: planData, sql, summary }),
    [dialect, normalizedGraph, planData, sql, summary],
  );
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = (resolvedTheme || theme || "light") as "light" | "dark";

  const explainQuery = useQuery({
    queryKey: ["sqllab", "explain-plan", explainCacheKey],
    queryFn: () =>
      aiApi.explainPlan({
        sql,
        dialect,
        plan: planData,
        graph: normalizedGraph,
        summary,
      }),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const explanation = (explainQuery.data as any)?.explanation;
  const isExplaining = explainQuery.isFetching;
  const handleExplain = () => {
    if (explanation) {
      setActiveTab("ai");
      return;
    }

    void explainQuery.refetch()
      .then((result) => {
        if (result.error) throw result.error;
        setActiveTab("ai");
      })
      .catch((error: Error) => toast.error(error.message || "Failed to explain execution plan"));
  };
  const handleAITabClick = () => {
    setActiveTab("ai");
  };

  const warningCount = normalizedGraph.nodes.filter((node) => node.warnings?.length).length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex min-h-12 items-center justify-between border-b border-border/60 bg-muted/10 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-black uppercase tracking-widest">Execution Plan</div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>{dialect}</span>
              <span>{normalizedGraph.nodes.length} nodes</span>
              {warningCount > 0 ? <span className="text-amber-500">{warningCount} warnings</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TabButton active={activeTab === "graph"} onClick={() => setActiveTab("graph")} icon={Activity}>Graph</TabButton>
          <TabButton active={activeTab === "ai"} onClick={handleAITabClick} icon={Bot}>AI</TabButton>
          <TabButton active={activeTab === "raw"} onClick={() => setActiveTab("raw")} icon={FileJson}>Raw</TabButton>
          <button
            type="button"
            onClick={handleExplain}
            disabled={isExplaining || !normalizedGraph.nodes.length}
            className="ml-2 inline-flex h-8 items-center gap-2 rounded-md border border-primary/25 bg-primary px-3 text-[11px] font-black uppercase tracking-widest text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExplaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {explanation ? "Explained" : "Explain"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "graph" ? (
          <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative bg-muted/5">
              {normalizedGraph.nodes.length ? (
                <ReactFlow
                  nodes={flowGraph.nodes}
                  edges={flowGraph.edges}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
                  minZoom={0.15}
                  maxZoom={2.2}
                  colorMode={currentTheme}
                  proOptions={{ hideAttribution: true }}
                  nodesDraggable={false}
                  panActivationKeyCode={null}
                  selectionKeyCode={null}
                  multiSelectionKeyCode={null}
                  deleteKeyCode={null}
                >
                  <Background gap={22} size={1.1} />
                  <Controls className="bg-background! border-border! shadow-lg! [&_path]:fill-foreground!" />
                </ReactFlow>
              ) : (
                <EmptyGraph />
              )}
            </div>
            <PlanSummary summary={summary} nodes={normalizedGraph.nodes} />
          </div>
        ) : null}

        {activeTab === "ai" ? (
          <AIExplanation
            explanation={explanation}
            isLoading={isExplaining}
            onExplain={handleExplain}
            canExplain={normalizedGraph.nodes.length > 0}
          />
        ) : null}

        {activeTab === "raw" ? <RawPlan planData={planData} dialect={dialect} /> : null}
      </div>
    </div>
  );
}
