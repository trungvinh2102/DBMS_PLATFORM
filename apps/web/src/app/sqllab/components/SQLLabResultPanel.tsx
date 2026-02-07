/**
 * @file SQLLabResultPanel.tsx
 * @description Panel for displaying query results, messages, syntax problems, and execution status.
 */

import { useState } from "react";
import {
  Loader2,
  Terminal,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SQLLabDataTable } from "./SQLLabDataTable";
import { exportData } from "@/lib/export";
import type { SyntaxError } from "./SQLLabEditorContainer";

// ============================================================================
// TYPES
// ============================================================================

interface SQLLabResultPanelProps {
  executing: boolean;
  error: string | null;
  results: Record<string, unknown>[];
  columns: string[];
  cursorPos: { lineNumber: number; column: number };
  tabSize?: number;
  /** Syntax validation errors from the editor */
  syntaxErrors?: SyntaxError[];
  /** Callback when clicking on a syntax error to navigate to it */
  onErrorClick?: (line: number, column: number) => void;
}

type TabType = "results" | "messages" | "problems";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get icon for severity level
 */
function getSeverityIcon(severity: number) {
  switch (severity) {
    case 8: // Error
      return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    case 4: // Warning
      return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />;
    case 2: // Info
      return <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5 text-gray-500 shrink-0" />;
  }
}

/**
 * Get severity class for styling
 */
function getSeverityClass(severity: number) {
  switch (severity) {
    case 8:
      return "text-red-500 bg-red-500/5 hover:bg-red-500/10";
    case 4:
      return "text-yellow-600 bg-yellow-500/5 hover:bg-yellow-500/10";
    case 2:
      return "text-blue-500 bg-blue-500/5 hover:bg-blue-500/10";
    default:
      return "text-gray-500 bg-gray-500/5 hover:bg-gray-500/10";
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SQLLabResultPanel({
  executing,
  error,
  results,
  columns,
  cursorPos,
  tabSize = 4,
  syntaxErrors = [],
  onErrorClick,
}: SQLLabResultPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("results");

  // Count errors and warnings
  const errorCount = syntaxErrors.filter((e) => e.severity === 8).length;
  const warningCount = syntaxErrors.filter((e) => e.severity === 4).length;
  const totalProblems = syntaxErrors.length;

  // Auto-switch to problems tab when there are errors, stay on messages if there's a runtime error
  const effectiveTab = error ? "messages" : activeTab;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden border-r">
      {/* Tab Header */}
      <div className="flex items-center justify-between h-11 border-b bg-muted/5 px-6 shrink-0">
        <div className="flex items-center gap-8 h-full font-black text-[10px] uppercase tracking-[0.2em]">
          {/* Results Tab */}
          <button
            onClick={() => setActiveTab("results")}
            className={cn(
              "h-full border-b-2 transition-all px-1 flex items-center gap-2",
              effectiveTab === "results"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground/40 hover:text-muted-foreground/60",
            )}
          >
            Results
            {results.length > 0 && (
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {results.length}
              </span>
            )}
          </button>

          {/* Messages Tab */}
          <button
            onClick={() => setActiveTab("messages")}
            className={cn(
              "h-full border-b-2 transition-all px-1 flex items-center gap-2",
              effectiveTab === "messages"
                ? error
                  ? "border-red-500 text-red-600"
                  : "border-primary text-primary"
                : "border-transparent text-muted-foreground/40 hover:text-muted-foreground/60",
              error &&
                effectiveTab !== "messages" &&
                "text-red-500/60 border-red-500/30",
            )}
          >
            Messages
            {error && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Problems Tab */}
          <button
            onClick={() => setActiveTab("problems")}
            className={cn(
              "h-full border-b-2 transition-all px-1 flex items-center gap-2",
              effectiveTab === "problems"
                ? totalProblems > 0
                  ? "border-red-500 text-red-600"
                  : "border-primary text-primary"
                : "border-transparent text-muted-foreground/40 hover:text-muted-foreground/60",
            )}
          >
            Problems
            {totalProblems > 0 && (
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  errorCount > 0
                    ? "bg-red-500/20 text-red-500"
                    : "bg-yellow-500/20 text-yellow-600",
                )}
              >
                {totalProblems}
              </span>
            )}
          </button>
        </div>

        {/* Export Button */}
        {results.length > 0 && effectiveTab === "results" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-7 px-2 font-black text-[9px] gap-1.5 opacity-60 hover:opacity-100 uppercase tracking-widest",
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  exportData(results, columns, "csv", "query_results")
                }
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Export as CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportData(results, columns, "xlsx", "query_results")
                }
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Problems Summary */}
        {effectiveTab === "problems" && totalProblems > 0 && (
          <div className="flex items-center gap-3 text-[10px] font-medium">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-background scrollbar-thin">
        {executing ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
            <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-20" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 animate-pulse">
              Processing Query...
            </span>
          </div>
        ) : effectiveTab === "results" ? (
          // Results Tab Content
          results.length > 0 ? (
            <SQLLabDataTable columns={columns} data={results} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20 p-12 text-center bg-muted/2">
              <Terminal className="h-12 w-12 mb-6" />
              <p className="text-sm font-black uppercase tracking-widest">
                Empty Result Set
              </p>
              <p className="text-xs mt-2 font-medium">
                Ready to execute your SQL statement.
              </p>
            </div>
          )
        ) : effectiveTab === "messages" ? (
          // Messages Tab Content
          error ? (
            <div className="p-8">
              <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-5 text-xs font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap max-h-48 overflow-auto shadow-sm">
                {error}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20 p-12 text-center">
              <Terminal className="h-12 w-12 mb-6" />
              <p className="text-sm font-black uppercase tracking-widest">
                No Messages
              </p>
              <p className="text-xs mt-2 font-medium">
                Query execution messages will appear here.
              </p>
            </div>
          )
        ) : // Problems Tab Content
        totalProblems > 0 ? (
          <div className="divide-y divide-border/50">
            {syntaxErrors.map((err) => (
              <div
                key={err.id}
                onClick={() => onErrorClick?.(err.line, err.column)}
                className={cn(
                  "flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                  getSeverityClass(err.severity),
                )}
              >
                {getSeverityIcon(err.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      [{err.line}:{err.column}]
                    </span>
                    <span className="text-xs font-medium truncate">
                      {err.message}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                    err.severity === 8
                      ? "bg-red-500/10 text-red-500"
                      : err.severity === 4
                        ? "bg-yellow-500/10 text-yellow-600"
                        : "bg-blue-500/10 text-blue-500",
                  )}
                >
                  {err.severityLabel}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20 p-12 text-center">
            <AlertCircle className="h-12 w-12 mb-6" />
            <p className="text-sm font-black uppercase tracking-widest">
              No Problems
            </p>
            <p className="text-xs mt-2 font-medium text-green-500/60">
              ✓ Your SQL syntax is valid
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="h-10 border-t bg-background flex items-center justify-between px-5 text-[10px] font-black text-muted-foreground/60 overflow-hidden shrink-0 uppercase tracking-widest divide-x divide-border/40">
        <div className="flex items-center gap-8 h-full">
          <span className="flex items-center gap-2.5 hover:bg-muted px-4 cursor-pointer transition-colors h-full">
            <Database className="h-4 w-4 text-primary/60" />
            UTF-8
          </span>
          <span className="hover:bg-muted px-4 cursor-pointer transition-colors h-full flex items-center">
            LN {cursorPos.lineNumber}, COL {cursorPos.column}
          </span>
          <span className="hover:bg-muted px-4 cursor-pointer transition-colors h-full flex items-center">
            SPACES: {tabSize}
          </span>
        </div>

        <div className="flex-1 flex items-center justify-end h-full gap-8">
          {/* Problems Count Badge */}
          {totalProblems > 0 && (
            <button
              onClick={() => setActiveTab("problems")}
              className="flex items-center gap-2 hover:bg-muted px-4 cursor-pointer transition-colors h-full"
            >
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3 w-3" />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  {warningCount}
                </span>
              )}
            </button>
          )}
          <div className="flex items-center gap-3 hover:bg-muted px-5 cursor-pointer transition-colors h-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            ASIA/HO_CHI_MINH (GMT+07:00)
          </div>
        </div>
      </footer>
    </div>
  );
}
