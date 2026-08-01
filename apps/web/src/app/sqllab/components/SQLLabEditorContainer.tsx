/**
 * @file SQLLabEditorContainer.tsx
 * @description Container for the SQL editor with tab support and database context.
 */

import { FileCode, Database, ChevronRight, Plus, X, Sparkles, History, MessageSquare } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { EditorLoadingSkeleton } from "./Skeletons";

const SQLEditor = lazy(() => import("@/lib/monaco/MonacoEditor").then((mod) => ({ default: mod.SQLEditor })));
const AIAssistant = lazy(() => import("./AIAssistant").then((mod) => ({ default: mod.AIAssistant })));

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
import { formatDBName } from "./sidebar/sidebar-utils";

const MongoAggregationBuilder = lazy(() => import("./MongoAggregationBuilder").then(m => ({ default: m.MongoAggregationBuilder })));

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
  const [aiShowHistory, setAiShowHistory] = useState(false);
  const [aiNewChatSignal, setAiNewChatSignal] = useState(0);
  const [hasActivatedAI, setHasActivatedAI] = useState(false);
  const selectedDSData = lab.dataSources?.find((ds: any) => ds.id === lab.selectedDS);
  const formatted = formatDBName(selectedDSData);

  useEffect(() => {
    if (lab.showAISidebar) setHasActivatedAI(true);
    if (lab.fixSQLError && !lab.showAISidebar) {
      setHasActivatedAI(true);
      lab.setShowAISidebar(true);
      lab.setShowRightPanel(false);
    }
  }, [lab.fixSQLError, lab.setShowAISidebar, lab.setShowRightPanel, lab.showAISidebar]);

  const aiLab = useMemo(() => ({
    selectedDS: lab.selectedDS,
    selectedSchema: lab.selectedSchema,
    selectedDSType: lab.selectedDSType,
    sql: lab.sql,
    error: lab.error,
    fixSQLError: lab.fixSQLError,
    queryLimit: lab.queryLimit,
    setFixSQLError: lab.setFixSQLError,
  }), [
    lab.selectedDS,
    lab.selectedSchema,
    lab.selectedDSType,
    lab.sql,
    lab.error,
    lab.fixSQLError,
    lab.queryLimit,
    lab.setFixSQLError,
  ]);

  const language = lab.isRelational ? "sql" : (lab.selectedDSType === "redis" ? "redis" : "javascript");
  const sqlDialect = lab.selectedDSType as any || "postgresql";
  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col bg-background">
      {/* Tabs Header */}
      <div className="flex items-center h-10 border-b bg-muted/5 px-2 overflow-x-auto no-scrollbar shrink-0">
        {lab.tabs.map((tab: any) => (
          <div
            key={tab.id}
            onClick={() => {
              lab.setShowAISidebar(false);
              setAiShowHistory(false);
              lab.setActiveTabId(tab.id);
            }}
            className={cn(
              "flex items-center h-10 px-4 border-r cursor-pointer transition-all group shrink-0 select-none",
              !lab.showAISidebar && lab.activeTabId === tab.id
                ? "bg-background border-t-2 border-t-primary text-foreground font-bold"
                : "text-muted-foreground hover:bg-muted/50 border-t-2 border-t-transparent",
            )}
          >
            <FileCode
              className={cn(
                "h-3.5 w-3.5 mr-2",
                !lab.showAISidebar && lab.activeTabId === tab.id
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
          onClick={() => {
            lab.setShowAISidebar(false);
            setAiShowHistory(false);
            lab.addTab();
          }}
          className="p-2 h-10 w-10 hover:bg-muted transition-colors flex items-center justify-center shrink-0 opacity-40 hover:opacity-100 border-r"
          title="New Tab"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setHasActivatedAI(true);
            lab.setShowAISidebar(true);
            lab.setShowRightPanel(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setHasActivatedAI(true);
              lab.setShowAISidebar(true);
              lab.setShowRightPanel(false);
            }
          }}
          className={cn(
            "flex h-10 shrink-0 cursor-pointer select-none items-center border-r border-t-2 px-4 transition-all",
            lab.showAISidebar
              ? "border-t-amber-500 bg-background font-bold text-foreground"
              : "border-t-transparent text-muted-foreground hover:bg-muted/50",
          )}
          title="AI Assistant"
        >
          <Sparkles
            className={cn(
              "mr-2 h-3.5 w-3.5",
              lab.showAISidebar ? "text-amber-500" : "text-muted-foreground/60",
            )}
          />
          <span className="max-w-32 truncate text-[10px] uppercase tracking-widest">
            AI Assistant
          </span>
          {lab.showAISidebar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                lab.setShowAISidebar(false);
                setAiShowHistory(false);
              }}
              className="ml-2 rounded-full p-0.5 opacity-70 transition-colors hover:bg-muted hover:opacity-100"
              aria-label="Close AI Assistant tab"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumbs / Metadata */}
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 text-[10px] font-medium text-muted-foreground/60">
        <div className="flex min-w-0 items-center gap-1.5">
          <Database className="h-3 w-3 shrink-0 opacity-40" />
          <span className="truncate font-bold lowercase tracking-tight text-foreground/70">
            {formatted.title.toLowerCase().replace(/\s+/g, "_")}
          </span>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-20" />
          <span className="font-mono lower opacity-80">{lab.selectedSchema || "main"}</span>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-20" />
          <span className="italic opacity-40">
            {lab.showAISidebar ? "ai_assistant" : "query_editor"}
          </span>
        </div>

        {lab.showAISidebar && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setAiShowHistory((current) => !current)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                aiShowHistory && "bg-primary/10 text-primary",
              )}
              aria-label={aiShowHistory ? "Hide conversation history" : "Show conversation history"}
              title={aiShowHistory ? "Hide history" : "Show history"}
            >
              {aiShowHistory ? <MessageSquare className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setAiShowHistory(false);
                setAiNewChatSignal((signal) => signal + 1);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-blue-500 transition-colors hover:bg-blue-500/10 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Start new AI chat"
              title="New chat"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAiShowHistory(false);
                lab.setShowAISidebar(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close AI Assistant"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
        {!lab.showAISidebar && (
          <Suspense fallback={<EditorLoadingSkeleton />}>
            <>
              {lab.selectedDSType === "mongodb" && (
                <Suspense fallback={<EditorLoadingSkeleton />}>
                  <MongoAggregationBuilder
                    collectionName={lab.selectedTable}
                    databaseName={lab.selectedSchema}
                    fields={lab.allColumns}
                    onApply={lab.setSql}
                    onRun={(query) => {
                      lab.setSql(query);
                      lab.handleRun(query);
                    }}
                  />
                </Suspense>
              )}
              <div className="min-h-0 flex-1">
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
                  columns={lab.autocompleteColumns as any}
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
              </div>
            </>
          </Suspense>
        )}
        {hasActivatedAI && (
          <Suspense fallback={<EditorLoadingSkeleton />}>
            <AIAssistant
              lab={aiLab}
              active={lab.showAISidebar}
              showHistory={aiShowHistory}
              onShowHistoryChange={setAiShowHistory}
              newChatSignal={aiNewChatSignal}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
