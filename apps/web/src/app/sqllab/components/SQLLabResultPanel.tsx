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
  XCircle,
  AlertTriangle,
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
import { ProblemsList } from "./ProblemsList";

interface SQLLabResultPanelProps {
  executing: boolean;
  error: string | null;
  results: Record<string, unknown>[];
  columns: string[];
  cursorPos: { lineNumber: number; column: number };
  tabSize?: number;
  syntaxErrors?: any[];
  onErrorClick?: (line: number, column: number) => void;
}

type TabType = "results" | "messages" | "problems";

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

  const errorCount = syntaxErrors.filter((e) => e.severity === 8).length;
  const warningCount = syntaxErrors.filter((e) => e.severity === 4).length;
  const totalProblems = syntaxErrors.length;
  const effectiveTab = error ? "messages" : activeTab;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden border-r">
      <div className="flex items-center justify-between h-11 border-b bg-muted/5 px-6 shrink-0">
        <div className="flex items-center gap-8 h-full font-black text-[10px] uppercase tracking-[0.2em]">
          <TabButton
            active={effectiveTab === "results"}
            onClick={() => setActiveTab("results")}
            count={results.length}
          >
            Results
          </TabButton>
          <TabButton
            active={effectiveTab === "messages"}
            onClick={() => setActiveTab("messages")}
            hasError={!!error}
          >
            Messages{" "}
            {error && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
            )}
          </TabButton>
          <TabButton
            active={effectiveTab === "problems"}
            onClick={() => setActiveTab("problems")}
            count={totalProblems}
            errorCount={errorCount}
          >
            Problems
          </TabButton>
        </div>

        {results.length > 0 && effectiveTab === "results" && (
          <ExportDropdown results={results} columns={columns} />
        )}
      </div>

      <div className="flex-1 overflow-auto bg-background scrollbar-thin">
        {executing ? (
          <LoadingState />
        ) : (
          <PanelContent
            tab={effectiveTab}
            results={results}
            columns={columns}
            error={error}
            syntaxErrors={syntaxErrors}
            onErrorClick={onErrorClick}
          />
        )}
      </div>

      <Footer
        cursorPos={cursorPos}
        tabSize={tabSize}
        errorCount={errorCount}
        warningCount={warningCount}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  count,
  hasError,
  errorCount,
}: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-full border-b-2 transition-all px-1 flex items-center gap-2",
        active
          ? count !== undefined && errorCount && errorCount > 0
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

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
      <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-20" />
      <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 animate-pulse">
        Processing Query...
      </span>
    </div>
  );
}

function PanelContent({
  tab,
  results,
  columns,
  error,
  syntaxErrors,
  onErrorClick,
}: any) {
  if (tab === "results") {
    return results.length > 0 ? (
      <SQLLabDataTable columns={columns} data={results} />
    ) : (
      <EmptyState
        icon={<Terminal className="h-12 w-12 mb-6" />}
        title="Empty Result Set"
        desc="Ready to execute your SQL statement."
      />
    );
  }
  if (tab === "messages") {
    return error ? (
      <div className="p-8">
        <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-5 text-xs font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap max-h-48 overflow-auto shadow-sm">
          {error}
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

function ExportDropdown({ results, columns }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-7 px-2 font-black text-[9px] gap-1.5 opacity-60 hover:opacity-100 uppercase tracking-widest",
        )}
      >
        <Download className="h-3.5 w-3.5" /> Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => exportData(results, columns, "csv", "query_results")}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportData(results, columns, "xlsx", "query_results")}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <span>Export as Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Footer({
  cursorPos,
  tabSize,
  errorCount,
  warningCount,
  setActiveTab,
}: any) {
  return (
    <footer className="h-10 border-t bg-background flex items-center justify-between px-5 text-[10px] font-black text-muted-foreground/60 overflow-hidden shrink-0 uppercase tracking-widest divide-x divide-border/40">
      <div className="flex items-center gap-8 h-full">
        <span className="flex items-center gap-2.5 hover:bg-muted px-4 cursor-pointer transition-colors h-full">
          <Database className="h-4 w-4 text-primary/60" /> UTF-8
        </span>
        <span className="hover:bg-muted px-4 cursor-pointer transition-colors h-full flex items-center">
          LN {cursorPos.lineNumber}, COL {cursorPos.column}
        </span>
        <span className="hover:bg-muted px-4 cursor-pointer transition-colors h-full flex items-center">
          SPACES: {tabSize}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-end h-full gap-8">
        {(errorCount > 0 || warningCount > 0) && (
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
  );
}
