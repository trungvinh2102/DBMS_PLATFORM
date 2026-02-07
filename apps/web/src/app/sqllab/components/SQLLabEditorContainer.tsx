/**
 * @file SQLLabEditorContainer.tsx
 * @description Container for the SQL editor with tab support and database context.
 */

import { FileCode, Database, ChevronRight, Plus, X } from "lucide-react";
import dynamic from "next/dynamic";
import { type QueryTab } from "../hooks/useSQLLab";
import { cn } from "@/lib/utils";

const SQLEditor = dynamic(
  () => import("../sql-editor").then((mod) => mod.SQLEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-background flex items-center justify-center text-muted-foreground">
        Loading Editor...
      </div>
    ),
  },
);

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

interface SQLLabEditorContainerProps {
  sql: string;
  setSql: (sql: string) => void;
  onPositionChange: (pos: { lineNumber: number; column: number }) => void;
  selectedDSName: string;
  selectedSchema: string;
  onRun?: () => void;
  onFormat?: () => void;
  onStop?: () => void;
  tabSize?: number;
  tables?: string[];
  columns?: any[];
  tabs: QueryTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newName: string) => void;
  undoTrigger?: number;
  redoTrigger?: number;
  /** Enable SQL syntax validation (default: true) */
  enableValidation?: boolean;
  /** Show error panel below editor (default: false) */
  showErrorPanel?: boolean;
  /** SQL dialect for validation (default: 'postgresql') */
  sqlDialect?: "mysql" | "postgresql" | "sqlite" | "mariadb" | "bigquery";
  /** Callback when syntax errors change */
  onErrorsChange?: (errors: SyntaxError[]) => void;
}

export function SQLLabEditorContainer({
  sql,
  setSql,
  onPositionChange,
  selectedDSName,
  selectedSchema,
  onRun,
  onFormat,
  onStop,
  tabSize,
  tables,
  columns,
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onCloseTab,
  onRenameTab,
  undoTrigger,
  redoTrigger,
  enableValidation = true,
  showErrorPanel = false,
  sqlDialect = "postgresql",
  onErrorsChange,
}: SQLLabEditorContainerProps) {
  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Tabs Header */}
      <div className="flex items-center h-10 border-b bg-muted/5 px-2 overflow-x-auto no-scrollbar shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center h-10 px-4 border-r cursor-pointer transition-all group shrink-0 select-none",
              activeTabId === tab.id
                ? "bg-background border-t-2 border-t-primary text-foreground font-bold"
                : "text-muted-foreground hover:bg-muted/50 border-t-2 border-t-transparent",
            )}
          >
            <FileCode
              className={cn(
                "h-3.5 w-3.5 mr-2",
                activeTabId === tab.id
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
                onCloseTab(tab.id);
              }}
              className={cn(
                "ml-2 p-0.5 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100",
                tabs.length === 1 && "hidden",
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={onAddTab}
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
          {selectedDSName.toLowerCase().replace(/\s+/g, "_") || "no_selection"}
        </span>
        <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
        <span className="opacity-80">{selectedSchema}</span>
        <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
        <span className="opacity-40 italic">Editor</span>
      </div>

      <div className="flex-1 relative overflow-hidden bg-background">
        <SQLEditor
          key={activeTabId} // Re-mount when switching tabs to ensure clean state
          value={sql}
          onChange={(val) => setSql(val || "")}
          onPositionChange={onPositionChange}
          onRun={onRun}
          onFormat={onFormat}
          onStop={onStop}
          tabSize={tabSize}
          tables={tables}
          columns={columns}
          undoTrigger={undoTrigger}
          redoTrigger={redoTrigger}
          enableValidation={enableValidation}
          showErrorPanel={showErrorPanel}
          sqlDialect={sqlDialect}
          onErrorsChange={onErrorsChange}
        />
      </div>
    </div>
  );
}
