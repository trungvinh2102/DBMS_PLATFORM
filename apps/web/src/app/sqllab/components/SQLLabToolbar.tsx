/**
 * @file SQLLabToolbar.tsx
 * @description Main toolbar for the SQL Lab, providing query execution, file operations, formatting, and side panel toggles.
 */

import {
  Database,
  FolderTree,
  Play,
  Square,
  List,
  FileCode,
  Save,
  Undo2,
  Redo2,
  AlignLeft,
  RotateCcw,
  Upload,
  Download,
  Zap,
  History,
  Table2,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolbarButton } from "./ToolbarButton";
import { Input } from "@/components/ui/input";

import { useSQLLabContext } from "../context/SQLLabContext";

export function SQLLabToolbar() {
  const lab = useSQLLabContext();
  return (
    <header className="flex items-center h-14 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10 px-3 shrink-0 gap-1 overflow-x-auto no-scrollbar">
      {/* Run & Stop Group */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={
            <Play
              className={cn(
                "h-4 w-4 text-primary",
                lab.executing && "animate-pulse",
              )}
            />
          }
          label="Run"
          onClick={() => lab.handleRun()}
          disabled={lab.executing || !lab.selectedDS}
          className="font-bold"
        />
        <ToolbarButton
          icon={<Square className="h-4 w-4 text-red-500/60" />}
          label="Stop"
          disabled={!lab.executing}
          onClick={lab.handleStop}
          className="hover:bg-red-500/5"
        />
        {lab.isRelational && lab.selectedDSType !== "clickhouse" && (
            <ToolbarButton
              icon={<Zap className={cn("h-4 w-4 text-amber-500", lab.executing && "animate-pulse")} />}
              label="Explain"
              onClick={() => lab.handleExplain()}
              disabled={lab.executing || !lab.selectedDS}
              className="font-bold border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-md"
            />
        )}
      </div>

      <div className="w-px h-6 bg-border/60 mx-1" />

      <ToolbarButton
        icon={<Save className="h-4 w-4 text-indigo-500" />}
        label="Save"
        onClick={lab.handleSave}
      />
      <ToolbarButton
        icon={<FileCode className="h-4 w-4 text-orange-500" />}
        label="Open"
        onClick={lab.handleOpen}
      />

      <div className="w-px h-6 bg-border/60 mx-1" />

      <ToolbarButton
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
        onClick={lab.handleUndo}
      />
      <ToolbarButton
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
        onClick={lab.handleRedo}
      />
      <ToolbarButton
        icon={<AlignLeft className="h-4 w-4" />}
        label="Format"
        onClick={lab.handleFormat}
      />

      {lab.isRelational && lab.selectedDSType !== "clickhouse" && (
        <>
          <div className="w-px h-6 bg-border/60 mx-1" />

          {/* Auto Commit Toggle */}
          <div
            role="switch"
            aria-checked={lab.activeResultTab === "results"}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lab.setActiveResultTab(lab.activeResultTab === "results" ? "messages" : "results");
              }
            }}
            className="flex items-center gap-2 px-3 h-9 hover:bg-muted/50 transition-colors rounded-md cursor-pointer border border-transparent hover:border-border/50"
            onClick={() => lab.setActiveResultTab(lab.activeResultTab === "results" ? "messages" : "results")}
          >
            <div
              className={cn(
                "relative w-8 h-4 rounded-full transition-all",
                lab.activeResultTab === "results" ? "bg-primary" : "bg-muted",
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                  lab.activeResultTab === "results" ? "left-4.5" : "left-0.5",
                )}
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">
              Auto Commit
            </span>
          </div>
        </>
      )}

      <div className="w-px h-6 bg-border/60 mx-1" />

      {/* Limit Configuration */}
      <div className="flex items-center gap-1.5 px-2 text-xs">
        <span className="text-muted-foreground whitespace-nowrap opacity-70 font-bold uppercase tracking-tight text-[10px]">
          Limit
        </span>
        <Input
          type="number"
          value={1000} // Simplified for now as limit was localized in hook
          onChange={(e) => {}}
          className="h-7 w-20 px-2 text-xs bg-muted/30"
          min={0}
        />
      </div>

      {lab.isRelational && lab.selectedDSType !== "clickhouse" && (
        <ToolbarButton
          icon={<RotateCcw className="h-4 w-4 text-amber-500" />}
          label="Rollback"
          onClick={lab.handleRollback}
        />
      )}

      <div className="w-px h-6 bg-border/60 mx-1" />

      <ToolbarButton
        icon={<Upload className="h-4 w-4 text-slate-500" />}
        label="Import"
        onClick={lab.handleImport}
      />
      <ToolbarButton
        icon={<Download className="h-4 w-4 text-slate-500" />}
        label="Export"
        onClick={lab.handleExport}
      />

      <div className="flex-1" />

      {/* Right Panel Controls */}
      <ToolbarButton
        icon={<Table2 className="h-4 w-4 text-blue-500" />}
        label="Object Info"
        active={lab.showRightPanel && lab.rightPanelMode === "object"}
        onClick={() => {
          if (lab.showRightPanel && lab.rightPanelMode === "object") {
            lab.setShowRightPanel(false);
          } else {
            lab.setShowRightPanel(true);
            lab.setRightPanelMode("object");
            lab.setShowAISidebar(false);
          }
        }}
        className={cn(
          lab.showRightPanel &&
            lab.rightPanelMode === "object" &&
            "bg-blue-500/10 border-blue-500/30",
        )}
      />

      {lab.isRelational && lab.selectedDSType !== "clickhouse" && (
        <ToolbarButton
          icon={<LayoutGrid className="h-4 w-4 text-emerald-500" />}
          label="Schema"
          active={lab.showRightPanel && lab.rightPanelMode === "schema"}
          onClick={() => {
            if (lab.showRightPanel && lab.rightPanelMode === "schema") {
              lab.setShowRightPanel(false);
            } else {
              lab.setShowRightPanel(true);
              lab.setRightPanelMode("schema");
              lab.setShowAISidebar(false);
            }
          }}
          className={cn(
            lab.showRightPanel &&
              lab.rightPanelMode === "schema" &&
              "bg-emerald-500/10 border-emerald-500/30",
          )}
        />
      )}

      <ToolbarButton
        icon={<History className="h-4 w-4 text-purple-500" />}
        label="SQL History"
        active={lab.showRightPanel && lab.rightPanelMode === "history"}
        onClick={() => {
          if (lab.showRightPanel && lab.rightPanelMode === "history") {
            lab.setShowRightPanel(false);
          } else {
            lab.setShowRightPanel(true);
            lab.setRightPanelMode("history");
            lab.setShowAISidebar(false);
          }
        }}
        className={cn(
          lab.showRightPanel &&
            lab.rightPanelMode === "history" &&
            "bg-purple-500/10 border-purple-500/30",
        )}
      />

      <ToolbarButton
        icon={<Zap className="h-4 w-4" />}
        label="AI SQL"
        active={lab.showAISidebar}
        onClick={() => {
          if (lab.showAISidebar) {
            lab.setShowAISidebar(false);
          } else {
            lab.setShowAISidebar(true);
            lab.setShowRightPanel(false);
          }
        }}
        className={cn(
          "font-bold transition-all duration-300",
          lab.showAISidebar
            ? "bg-amber-500/20 text-amber-600 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            : "text-amber-600/70 hover:bg-amber-500/10 hover:text-amber-600 border-transparent",
        )}
      />
    </header>
  );
}
