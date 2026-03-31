/**
 * @file SQLLabEditorContainer.tsx
 * @description Container for the SQL editor with tab support and database context.
 */

import { FileCode, Database, ChevronRight, Plus, X } from "lucide-react";
import { lazy, Suspense } from "react";
import { type QueryTab } from "../hooks/use-sqllab-tabs";
import { cn } from "@/lib/utils";
import { EditorLoadingSkeleton } from "./Skeletons";

const SQLEditor = lazy(() => import("@/lib/monaco/MonacoEditor").then((mod) => ({ default: mod.SQLEditor })));

/** Syntax error entry type */
export interface SyntaxError {
  id: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: number;
  severityLabel: string;
}

import { useSQLLabContext } from "../context/SQLLabContext";

export function SQLLabEditorContainer({
  enableValidation = true,
  showErrorPanel = false,
  onErrorsChange,
}: {
  enableValidation?: boolean;
  showErrorPanel?: boolean;
  onErrorsChange?: (errors: SyntaxError[]) => void;
}) {
  const lab = useSQLLabContext();
  const language = lab.isRelational ? "sql" : (lab.selectedDSType === "redis" ? "redis" : "javascript");
  const sqlDialect = lab.selectedDSType as any || "postgresql";
  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Tabs Header */}
      <div className="flex items-center h-10 border-b bg-muted/5 px-2 overflow-x-auto no-scrollbar shrink-0">
        {lab.tabs.map((tab: any) => (
          <div
            key={tab.id}
            onClick={() => lab.setActiveTabId(tab.id)}
            className={cn(
              "flex items-center h-10 px-4 border-r cursor-pointer transition-all group shrink-0 select-none",
              lab.activeTabId === tab.id
                ? "bg-background border-t-2 border-t-primary text-foreground font-bold"
                : "text-muted-foreground hover:bg-muted/50 border-t-2 border-t-transparent",
            )}
          >
            <FileCode
              className={cn(
                "h-3.5 w-3.5 mr-2",
                lab.activeTabId === tab.id
                  ? "text-primary"
                  : "text-muted-foreground/60",
              )}
            />
            <span className="text-[10px] uppercase tracking-widest truncate max-w-30">
              {tab.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                lab.closeTab(tab.id);
              }}
              className={cn(
                "ml-2 p-0.5 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100",
                lab.tabs.length === 1 && "hidden",
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={lab.addTab}
          className="p-2 h-10 w-10 hover:bg-muted transition-colors flex items-center justify-center shrink-0 opacity-40 hover:opacity-100 border-r"
          title="New Tab"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Breadcrumbs / Metadata */}
      <div className="flex items-center h-9 px-4 bg-background border-b text-[10px] text-muted-foreground/60 gap-1.5 shrink-0 font-medium">
        <Database className="h-3 w-3 opacity-40 shrink-0" />
        <span className="font-bold text-foreground/70 lowercase tracking-tight">
          {lab.selectedDSName.toLowerCase().replace(/\s+/g, "_") || "no_selection"}
        </span>
        <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
        <span className="opacity-80">{lab.selectedSchema}</span>
        <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
        <span className="opacity-40 italic">Editor</span>
      </div>

      <div className="flex-1 relative overflow-hidden bg-background">
        <Suspense fallback={<EditorLoadingSkeleton />}>
          <SQLEditor
            key={lab.activeTabId} // Re-mount when switching tabs to ensure clean state
            value={lab.sql}
            onChange={(val) => lab.setSql(val || "")}
            onPositionChange={lab.setCursorPos}
            onRun={lab.handleRun}
            onFormat={lab.handleFormat}
            onStop={lab.handleStop}
            onSave={lab.handleSave}
            tabSize={lab.tabSize}
            tables={lab.tables}
            columns={lab.allColumns as any}
            undoTrigger={lab.undoTrigger}
            redoTrigger={lab.redoTrigger}
            enableValidation={enableValidation}
            showErrorPanel={showErrorPanel}
            sqlDialect={sqlDialect}
            language={language}
            databaseId={lab.selectedDS}
            schemaId={lab.selectedSchema}
            onErrorsChange={onErrorsChange}
          />
        </Suspense>
      </div>
    </div>
  );
}
