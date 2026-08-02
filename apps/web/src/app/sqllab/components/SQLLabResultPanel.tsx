/**
 * @file SQLLabResultPanel.tsx
 * @description Master results panel for SQL Lab, organizing results, lineages, and error logs using sub-components.
 */

import React, { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSQLLabContext, useSQLLabEditorContext, useSQLLabResultContext } from "../context/SQLLabContext";

// Internal Components
import { PanelContent } from "./results/PanelContent";
import { ResultFooter } from "./results/ResultFooter";

const ExportDropdown = lazy(() => import("./results/ExportDropdown").then(m => ({ default: m.ExportDropdown })));

const EMPTY_SYNTAX_ERRORS: any[] = [];

/**
 * Orchestrates the display of query outputs and execution messages.
 */
export function SQLLabResultPanel({
  syntaxErrors = EMPTY_SYNTAX_ERRORS,
  onErrorClick,
}: {
  syntaxErrors?: any[];
  onErrorClick?: (line: number, column: number) => void;
}) {
  const lab = useSQLLabContext();
  const { sql } = useSQLLabEditorContext();
  const { results, columns, error, executing, activeResultTab, setActiveResultTab } = useSQLLabResultContext();
  const isMongoDB = lab.selectedDSType === "mongodb";
  const errorCount = syntaxErrors.filter((e) => e.severity === 8).length;
  const warningCount = syntaxErrors.filter((e) => e.severity === 4).length;
  const totalProblems = syntaxErrors.length;
  const effectiveTab = activeResultTab;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden border-r">
      {/* Tabs Header */}
      <div className="flex items-center justify-between h-11 border-b bg-muted/5 px-6 shrink-0">
        <div className="flex items-center gap-8 h-full font-black text-[10px] uppercase tracking-[0.2em]">
          <TabButton
            active={effectiveTab === "results"}
            onClick={() => setActiveResultTab("results")}
            count={results.length}
          >
            Results
          </TabButton>
          <TabButton
            active={effectiveTab === "messages"}
            onClick={() => setActiveResultTab("messages")}
            hasError={!!error}
          >
            Messages
            {error && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
            )}
          </TabButton>
          <TabButton
            active={effectiveTab === "problems"}
              onClick={() => setActiveResultTab("problems")}
            count={totalProblems}
            errorCount={errorCount}
          >
            Problems
          </TabButton>
          {!isMongoDB && !["clickhouse", "duckdb"].includes(lab.selectedDSType) && (
            <TabButton
              active={effectiveTab === "lineage"}
              onClick={() => setActiveResultTab("lineage")}
            >
              Lineage
            </TabButton>
          )}
        </div>

        {results.length > 0 && effectiveTab === "results" && (
          <Suspense fallback={null}>
            <ExportDropdown
              results={results}
              columns={columns}
              encoding={lab.resultEncoding}
            />
          </Suspense>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-background relative overflow-hidden">
        {executing ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
            <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-20" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 animate-pulse">
              Processing Query...
            </span>
          </div>
        ) : (
          <PanelContent
            tab={effectiveTab}
            results={results}
            columns={columns}
            error={error}
            syntaxErrors={syntaxErrors}
            onErrorClick={onErrorClick}
            sql={sql}
            dataSources={lab.dataSources}
            selectedDS={lab.selectedDS}
            onFixWithAI={lab.setFixSQLError}
          />
        )}
      </div>

      <ResultFooter
        tabSize={lab.tabSize}
        errorCount={errorCount}
        warningCount={warningCount}
         setActiveTab={setActiveResultTab}
        encoding={lab.resultEncoding}
      />
    </div>
  );
}

/**
 * Internal tab button for the results panel.
 */
function TabButton({
  children,
  active,
  onClick,
  count,
  errorCount,
}: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-full border-b-2 transition-all px-1 flex items-center gap-2",
        active
          ? errorCount && errorCount > 0
            ? "border-red-500 text-red-600"
            : "border-primary text-primary"
          : "border-transparent text-muted-foreground/40 hover:text-muted-foreground/60",
      )}
    >
      {children}
      {count > 0 && (
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
            errorCount && errorCount > 0
              ? "bg-red-500/20 text-red-500"
              : "bg-primary/10 text-primary",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
