/**
 * @file SQLLabObjectPanel.tsx
 * @description Right panel for SQLLab showing object details like Data preview and Structure.
 */

import {
  Database,
  ChevronRight,
  Table,
  RotateCcw,
  Search,
  Loader2,
  Info,
  Clock,
  ChevronLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  CalendarClock,
  FunctionSquare,
  Settings2,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportData } from "@/lib/export";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SQLLabDataTable } from "./SQLLabDataTable";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  EmptyObjectSelection,
  DataTabView,
  StructureTabView,
  IndexTabView,
  RelationTabView,
  TriggerTabView,
  InfoTabView,
  ScriptTabView,
} from "./ObjectPanelTabs";

// Dynamically import Monaco Editor to avoid heavy bundle and hydration mismatch
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface SQLLabObjectPanelProps {
  activeRightTab: string;
  setActiveRightTab: (tab: string) => void;
  selectedSchema: string;
  selectedTable: string | null;
  selectedObjectType?: string;
  onRefreshTables: () => void;
  loadingTData: boolean;
  currentTData: any[];
  currentTColumns: string[];
  executionTime?: number;
  isLoadingColumns: boolean;
  columnsData: any[] | undefined;
  indexes?: any[];
  foreignKeys?: any[];
  tableInfo?: any;
  tableDDL?: string;
  triggers?: string[];
  isRelational: boolean;
}

const ObjectIcon = ({
  selectedObjectType,
}: {
  selectedObjectType?: string;
}) => {
  switch (selectedObjectType) {
    case "view":
      return <Eye className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
    case "event":
      return <CalendarClock className="h-3.5 w-3.5 text-orange-500 shrink-0" />;
    case "function":
      return (
        <FunctionSquare className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
      );
    case "procedure":
      return <Settings2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
    case "trigger":
      return <Zap className="h-3.5 w-3.5 text-green-500 shrink-0" />;
    default:
      return <Table className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
  }
};

export function SQLLabObjectPanel({
  activeRightTab,
  setActiveRightTab,
  selectedSchema,
  selectedTable,
  selectedObjectType,
  onRefreshTables,
  loadingTData,
  currentTData,
  currentTColumns,
  executionTime,
  isLoadingColumns,
  columnsData,
  indexes,
  foreignKeys,
  tableInfo,
  tableDDL,
  triggers,
  isRelational,
}: SQLLabObjectPanelProps) {
  const [structureSearch, setStructureSearch] = useState("");
  const { theme } = useTheme();
  // Use the same custom themes as the main SQLEditor to prevent global theme override
  const monacoTheme = theme === "dark" ? "querypie-dark" : "querypie-light";

  // availableTabs is determined based on selectedObjectType
  let availableTabs = [
    "Data",
    "Structure",
    "Index",
    ...(isRelational ? ["Relation", "Trigger"] : []),
    "Info",
    ...(isRelational ? ["Script"] : []),
  ];
  if (selectedObjectType === "view") {
    availableTabs = ["Data", "Structure", "Info", ...(isRelational ? ["Script"] : [])];
  } else if (
    ["event", "function", "procedure", "trigger"].includes(
      selectedObjectType || "",
    )
  ) {
    availableTabs = ["Info", ...(isRelational ? ["Script"] : [])];
  }

  // Ensure we always have a valid tab selected even if state is slightly behind
  const activeTabLower = activeRightTab.toLowerCase();
  const lowerTabs = availableTabs.map((t) => t.toLowerCase());
  const effectiveTab = lowerTabs.includes(activeTabLower)
    ? activeTabLower
    : lowerTabs[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center h-10 border-b overflow-x-auto no-scrollbar bg-muted/5 shrink-0">
        {availableTabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveRightTab(t.toLowerCase())}
            className={cn(
              "px-5 h-full text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
              effectiveTab === t.toLowerCase()
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground/60 hover:text-foreground hover:bg-muted/30",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center h-10 px-5 bg-background border-b text-[10px] text-muted-foreground/60 gap-2 shrink-0 font-bold uppercase tracking-tight">
        <Database className="h-3.5 w-3.5 opacity-40 shrink-0" />
        <span className="text-foreground/80 truncate">{selectedSchema}</span>
        <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
        <ObjectIcon selectedObjectType={selectedObjectType} />
        <span className="text-foreground/80 truncate">
          {selectedTable || "UNSELECTED"}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-50 hover:opacity-100"
            onClick={onRefreshTables}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {effectiveTab === "data" && currentTData.length > 0 && (
            <>
              <div className="w-px h-4 bg-border/60" />
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-7 px-2 font-black text-[9px] gap-1.5 opacity-60 hover:opacity-100",
                  )}
                >
                  <Download className="h-3 w-3" />
                  EXPORT
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportData(
                        currentTData,
                        currentTColumns,
                        "csv",
                        selectedTable || "table_data",
                      )
                    }
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Export as CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportData(
                        currentTData,
                        currentTColumns,
                        "xlsx",
                        selectedTable || "table_data",
                      )
                    }
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Export as Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-background scrollbar-thin">
        {!selectedTable ? (
          <EmptyObjectSelection />
        ) : effectiveTab === "data" ? (
          <DataTabView
            loadingTData={loadingTData}
            currentTData={currentTData}
            currentTColumns={currentTColumns}
          />
        ) : effectiveTab === "structure" ? (
          <StructureTabView
            isLoadingColumns={isLoadingColumns}
            columnsData={columnsData}
            structureSearch={structureSearch}
            setStructureSearch={setStructureSearch}
          />
        ) : effectiveTab === "index" ? (
          <IndexTabView indexes={indexes} />
        ) : effectiveTab === "relation" ? (
          <RelationTabView foreignKeys={foreignKeys} />
        ) : effectiveTab === "trigger" ? (
          <TriggerTabView triggers={triggers} />
        ) : effectiveTab === "info" ? (
          <InfoTabView tableInfo={tableInfo} />
        ) : effectiveTab === "script" ? (
          <ScriptTabView tableDDL={tableDDL} monacoTheme={monacoTheme} />
        ) : (
          <div className="flex items-center justify-center h-full p-16 text-center text-muted-foreground/5 font-black uppercase tracking-[1em] text-[10px]">
            {activeRightTab}
          </div>
        )}
      </div>

      {activeRightTab === "data" && currentTData.length > 0 && (
        <div className="h-11 border-t flex items-center justify-between px-5 bg-muted/5 shrink-0 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <button className="h-7 w-7 hover:bg-muted rounded-full transition-colors flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tracking-tighter">
              1-{currentTData.length} OF {currentTData.length}
            </span>
            <button className="h-7 w-7 hover:bg-muted rounded-full transition-colors flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 opacity-40" />
            <span>{executionTime || 0}MS</span>
          </div>
        </div>
      )}
    </div>
  );
}
