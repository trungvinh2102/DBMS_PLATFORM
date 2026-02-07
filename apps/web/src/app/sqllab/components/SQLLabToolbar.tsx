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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolbarButton } from "./ToolbarButton";

interface SQLLabToolbarProps {
  handleRun: () => void;
  executing: boolean;
  selectedDS: string;
  showRightPanel: boolean;
  setShowRightPanel: (show: boolean) => void;
  rightPanelMode: "object" | "history";
  setRightPanelMode: (mode: "object" | "history") => void;
  handleFormat: () => void;
  handleStop?: () => void;
  autoCommit: boolean;
  setAutoCommit: (auto: boolean) => void;
  onSave?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRollback?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpen?: () => void;
  showAISidebar: boolean;
  setShowAISidebar: (show: boolean) => void;
}

export function SQLLabToolbar({
  handleRun,
  executing,
  selectedDS,
  showRightPanel,
  setShowRightPanel,
  rightPanelMode,
  setRightPanelMode,
  handleFormat,
  handleStop,
  autoCommit,
  setAutoCommit,
  onSave,
  onImport,
  onExport,
  onRollback,
  onUndo,
  onRedo,
  onOpen,
  showAISidebar,
  setShowAISidebar,
}: SQLLabToolbarProps) {
  return (
    <header className="flex items-center h-14 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10 px-3 shrink-0 gap-1 overflow-x-auto no-scrollbar">
      {/* Run & Stop Group */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={
            <Play
              className={cn(
                "h-4 w-4 text-emerald-600",
                executing && "animate-pulse",
              )}
            />
          }
          label="Run"
          onClick={handleRun}
          disabled={executing || !selectedDS}
          className="font-bold"
        />
        <ToolbarButton
          icon={<Square className="h-4 w-4 text-red-500/60" />}
          label="Stop"
          disabled={!executing}
          onClick={handleStop}
          className="hover:bg-red-500/5"
        />
      </div>

      <div className="w-px h-6 bg-border/60 mx-1" />

      <ToolbarButton
        icon={<Save className="h-4 w-4 text-indigo-500" />}
        label="Save"
        onClick={onSave}
      />
      <ToolbarButton
        icon={<FileCode className="h-4 w-4 text-orange-500" />}
        label="Open"
        onClick={onOpen}
      />

      <div className="w-px h-6 bg-border/60 mx-1" />

      <ToolbarButton
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
        onClick={onUndo}
      />
      <ToolbarButton
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
        onClick={onRedo}
      />
      <ToolbarButton
        icon={<AlignLeft className="h-4 w-4" />}
        label="Format"
        onClick={handleFormat}
      />

      <div className="w-px h-6 bg-border/60 mx-1" />

      {/* Auto Commit Toggle */}
      <div
        className="flex items-center gap-2 px-3 h-9 hover:bg-muted/50 transition-colors rounded-md cursor-pointer border border-transparent hover:border-border/50"
        onClick={() => setAutoCommit(!autoCommit)}
      >
        <div
          className={cn(
            "relative w-8 h-4 rounded-full transition-all",
            autoCommit ? "bg-primary" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
              autoCommit ? "left-4.5" : "left-0.5",
            )}
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">
          Auto Commit
        </span>
      </div>

      <ToolbarButton
        icon={<RotateCcw className="h-4 w-4 text-amber-500" />}
        label="Rollback"
        onClick={onRollback}
      />

      <div className="w-px h-6 bg-border/60 mx-1" />

      <ToolbarButton
        icon={<Upload className="h-4 w-4 text-slate-500" />}
        label="Import"
        onClick={onImport}
      />
      <ToolbarButton
        icon={<Download className="h-4 w-4 text-slate-500" />}
        label="Export"
        onClick={onExport}
      />

      <div className="flex-1" />

      {/* Right Panel Controls */}
      <ToolbarButton
        icon={<Table2 className="h-4 w-4 text-blue-500" />}
        label="Object Info"
        active={showRightPanel && rightPanelMode === "object"}
        onClick={() => {
          if (showRightPanel && rightPanelMode === "object") {
            setShowRightPanel(false);
          } else {
            setShowRightPanel(true);
            setRightPanelMode("object");
            setShowAISidebar(false);
          }
        }}
        className={cn(
          showRightPanel &&
            rightPanelMode === "object" &&
            "bg-blue-500/10 border-blue-500/30",
        )}
      />

      <ToolbarButton
        icon={<History className="h-4 w-4 text-purple-500" />}
        label="SQL History"
        active={showRightPanel && rightPanelMode === "history"}
        onClick={() => {
          if (showRightPanel && rightPanelMode === "history") {
            setShowRightPanel(false);
          } else {
            setShowRightPanel(true);
            setRightPanelMode("history");
            setShowAISidebar(false);
          }
        }}
        className={cn(
          showRightPanel &&
            rightPanelMode === "history" &&
            "bg-purple-500/10 border-purple-500/30",
        )}
      />

      <ToolbarButton
        icon={<Zap className="h-4 w-4" />}
        label="AI SQL"
        active={showAISidebar}
        onClick={() => {
          if (showAISidebar) {
            setShowAISidebar(false);
          } else {
            setShowAISidebar(true);
            setShowRightPanel(false);
          }
        }}
        className={cn(
          "font-bold transition-all duration-300",
          showAISidebar
            ? "bg-amber-500/20 text-amber-600 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            : "text-amber-600/70 hover:bg-amber-500/10 hover:text-amber-600 border-transparent",
        )}
      />
    </header>
  );
}
