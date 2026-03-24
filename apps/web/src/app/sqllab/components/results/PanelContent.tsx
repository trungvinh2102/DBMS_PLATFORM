/**
 * @file PanelContent.tsx
 * @description Main content switcher for the SQL Lab results panel, displaying results, charts, or errors.
 */

import React, { lazy, Suspense } from "react";
import { Terminal, XCircle, Sparkles } from "lucide-react";
import { SQLLabDataTable } from "../SQLLabDataTable";
import { NoSQLResults } from "../NoSQLResults";
import { ProblemsList } from "../ProblemsList";

const ChartViewer = lazy(() => import("../ChartViewer").then((m) => ({ default: m.ChartViewer })));
const LineageViewer = lazy(() => import("../LineageViewer").then((m) => ({ default: m.LineageViewer })));

interface PanelContentProps {
  tab: string;
  results: any[];
  columns: string[];
  error: string | null;
  syntaxErrors: any[];
  onErrorClick?: (line: number, column: number) => void;
  sql: string;
  dataSources?: any[];
  selectedDS?: string;
  onFixWithAI?: (v: string) => void;
}

export function PanelContent({
  tab,
  results,
  columns,
  error,
  syntaxErrors,
  onErrorClick,
  sql,
  dataSources,
  selectedDS,
  onFixWithAI,
}: PanelContentProps) {
  const isMongoDB = dataSources?.find((ds: any) => ds.id === selectedDS)?.type === "mongodb";

  if (tab === "results") {
    if (results.length > 0) {
      return isMongoDB ? (
        <NoSQLResults data={results} />
      ) : (
        <SQLLabDataTable columns={columns} data={results} />
      );
    }
    return (
      <EmptyState
        icon={<Terminal className="h-12 w-12 mb-6" />}
        title="Empty Result Set"
        desc="Ready to execute your SQL statement."
      />
    );
  }
  
  if (tab === "charts") {
    return (
      <Suspense fallback={<div className="p-8 flex items-center justify-center text-muted-foreground animate-pulse">Loading charts...</div>}>
        {results.length > 0 ? (
          <ChartViewer results={results} columns={columns} />
        ) : (
          <EmptyState
            icon={<Terminal className="h-12 w-12 mb-6" />}
            title="No Data for Charts"
            desc="Execute a query returning data to generate charts."
          />
        )}
      </Suspense>
    );
  }
  
  if (tab === "lineage") {
    const ds = dataSources?.find((d: any) => d.id === selectedDS);
    return (
      <Suspense fallback={<div className="p-8 flex items-center justify-center text-muted-foreground animate-pulse text-[10px] font-black uppercase tracking-widest">Loading lineage...</div>}>
        <LineageViewer sql={sql} dataSource={ds} />
      </Suspense>
    );
  }

  if (tab === "messages") {
    return error ? (
      <div className="p-8">
        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-6 font-mono text-red-700 dark:text-red-400 shadow-xl glass transition-all duration-500 overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Execution Error</span>
            </div>
          </div>
          <div className="text-xs whitespace-pre-wrap max-h-64 overflow-auto scrollbar-thin pr-4 leading-relaxed opacity-80">
            {error}
          </div>
          <div className="mt-6 pt-6 border-t border-red-500/10 flex justify-end">
            <button
              onClick={() => onFixWithAI?.(error)}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            >
              <Sparkles className="h-4 w-4" />
              Fix with AI
            </button>
          </div>
        </div>
      </div>
    ) : (
      <EmptyState
        icon={<Terminal className="h-12 w-12 mb-6" />}
        title="No Messages"
        desc="Query execution messages will appear here."
      />
    );
  }

  return <ProblemsList errors={syntaxErrors} onItemClick={onErrorClick} />;
}

function EmptyState({ icon, title, desc }: any) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20 p-12 text-center bg-muted/2">
      {icon}
      <p className="text-sm font-black uppercase tracking-widest">{title}</p>
      <p className="text-xs mt-2 font-medium">{desc}</p>
    </div>
  );
}
