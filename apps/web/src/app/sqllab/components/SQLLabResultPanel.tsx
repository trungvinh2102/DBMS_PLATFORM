/**
 * @file SQLLabResultPanel.tsx
 * @description Master results panel for SQL Lab, organizing results, charts, lineages, and error logs using sub-components.
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSQLLabContext } from "../context/SQLLabContext";

// Internal Components
import { PanelContent } from "./results/PanelContent";
import { ExportDropdown } from "./results/ExportDropdown";
import { ResultFooter } from "./results/ResultFooter";

const EMPTY_SYNTAX_ERRORS: any[] = [];

/**
 * Orchestrates the display of query outputs, charts, and execution messages.
 */
export function SQLLabResultPanel({
  syntaxErrors = EMPTY_SYNTAX_ERRORS,
  onErrorClick,
}: {
  syntaxErrors?: any[];
  onErrorClick?: (line: number, column: number) => void;
}) {
  const lab = useSQLLabContext();
  const isMongoDB = lab.selectedDSType === "mongodb";
  const errorCount = syntaxErrors.filter((e) => e.severity === 8).length;
  const warningCount = syntaxErrors.filter((e) => e.severity === 4).length;
  const totalProblems = syntaxErrors.length;
  const effectiveTab = lab.activeResultTab;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden border-r">
      {/* Tabs Header */}
      <div className="flex items-center justify-between h-11 border-b bg-muted/5 px-6 shrink-0">
        <div className="flex items-center gap-8 h-full font-black text-[10px] uppercase tracking-[0.2em]">
          <TabButton
            active={effectiveTab === "results"}
            onClick={() => lab.setActiveResultTab("results")}
            count={lab.results.length}
          >
            Results
          </TabButton>
          <TabButton
            active={effectiveTab === "messages"}
            onClick={() => lab.setActiveResultTab("messages")}
            hasError={!!lab.error}
          >
            Messages
            {lab.error && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
            )}
          </TabButton>
          <TabButton
            active={effectiveTab === "problems"}
            onClick={() => lab.setActiveResultTab("problems")}
            count={totalProblems}
            errorCount={errorCount}
          >
            Problems
          </TabButton>
          <TabButton
            active={effectiveTab === "charts"}
            onClick={() => lab.setActiveResultTab("charts")}
          >
            Charts
          </TabButton>
          {!isMongoDB && lab.selectedDSType !== "clickhouse" && (
            <TabButton
              active={effectiveTab === "lineage"}
              onClick={() => lab.setActiveResultTab("lineage")}
            >
              Lineage
            </TabButton>
          )}
        </div>

        {lab.results.length > 0 && effectiveTab === "results" && (
          <ExportDropdown
            results={lab.results}
            columns={lab.columns}
            encoding={lab.resultEncoding}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-background relative overflow-hidden">
        {lab.executing ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
            <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-20" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 animate-pulse">
              Processing Query...
            </span>
          </div>
        ) : (
          <PanelContent
            tab={effectiveTab}
            results={lab.results}
            columns={lab.columns}
            error={lab.error}
            syntaxErrors={syntaxErrors}
            onErrorClick={onErrorClick}
            sql={lab.sql}
            dataSources={lab.dataSources}
            selectedDS={lab.selectedDS}
            onFixWithAI={lab.setFixSQLError}
          />
        )}
      </div>

      <ResultFooter
        cursorPos={lab.cursorPos}
        tabSize={lab.tabSize}
        errorCount={errorCount}
        warningCount={warningCount}
        setActiveTab={lab.setActiveResultTab}
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
