/**
 * @file SQLLabObjectPanel.tsx
 * @description Right panel for SQLLab showing object details like Data preview and Structure.
 */

import {
  Database,
  ChevronRight,
  Table,
  RotateCcw,
  Loader2,
  Table as TableIcon,
  Search,
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

import { useState } from "react";
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
  DiagnosticsTabView,
} from "./ObjectPanelTabs";

import { useSQLLabContext } from "../context/SQLLabContext";

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
      return <TableIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
  }
};

export function SQLLabObjectPanel() {
  const lab = useSQLLabContext();
  const [structureSearch, setStructureSearch] = useState("");
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "dark" ? "dbms-dark" : "dbms-light";

  const isDiagnosticsSupported = ["sqlite", "duckdb"].includes(lab.selectedDSType);
  const hasTriggerSupport = lab.isRelational && !["clickhouse", "duckdb"].includes(lab.selectedDSType);
  const hasRelationSupport = lab.isRelational && !["clickhouse", "duckdb"].includes(lab.selectedDSType);
  const hasIndexSupport = lab.isRelational && lab.selectedDSType !== "duckdb";
  const hasScriptSupport = lab.isRelational && lab.selectedDSType !== "duckdb";

  let availableTabs = [
    "Info",
    "Data",
    "Structure",
    ...(isDiagnosticsSupported ? ["Diagnostics"] : []),
    ...(hasIndexSupport ? ["Index"] : []),
    ...(hasRelationSupport ? ["Relation"] : []),
    ...(hasTriggerSupport ? ["Trigger"] : []),
    ...(hasScriptSupport ? ["Script"] : []),
  ];
  if (lab.selectedObjectType === "view") {
    availableTabs = ["Info", "Data", "Structure", ...(isDiagnosticsSupported ? ["Diagnostics"] : []), ...(hasScriptSupport ? ["Script"] : [])];
  } else if (
    ["event", "function", "procedure", "trigger"].includes(
      lab.selectedObjectType || "",
    )
  ) {
    availableTabs = ["Info", ...(hasScriptSupport ? ["Script"] : [])];
  }

  const activeTabLower = lab.activeRightTab.toLowerCase();
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
            onClick={() => lab.setActiveRightTab(t.toLowerCase())}
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
        <span className="text-foreground/80 truncate">{lab.selectedSchema}</span>
        <ChevronRight className="h-3 w-3 opacity-20 shrink-0" />
        <ObjectIcon selectedObjectType={lab.selectedObjectType} />
        <span className="text-foreground/80 truncate">
          {lab.selectedTable || "UNSELECTED"}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-50 hover:opacity-100"
            onClick={lab.refetchTables}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {effectiveTab === "data" && lab.currentTData.length > 0 && (
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
                        lab.currentTData,
                        lab.currentTColumns,
                        "csv",
                        lab.selectedTable || "table_data",
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
                        lab.currentTData,
                        lab.currentTColumns,
                        "xlsx",
                        lab.selectedTable || "table_data",
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
        {!lab.selectedTable ? (
          <EmptyObjectSelection />
        ) : effectiveTab === "data" ? (
          <DataTabView
            loadingTData={lab.loadingTData}
            currentTData={lab.currentTData}
            currentTColumns={lab.currentTColumns}
            allColumns={lab.allColumns}
            onSave={lab.handleUpdateData}
          />
        ) : effectiveTab === "structure" ? (
          <StructureTabView
            isLoadingColumns={lab.isLoadingColumns}
            columnsData={lab.allColumns as any}
            structureSearch={structureSearch}
            setStructureSearch={setStructureSearch}
          />
        ) : effectiveTab === "diagnostics" ? (
          <DiagnosticsTabView
            databaseId={lab.selectedDS}
            table={lab.selectedTable}
          />
        ) : effectiveTab === "index" ? (
          <IndexTabView indexes={lab.indexes} />
        ) : effectiveTab === "relation" ? (
          <RelationTabView foreignKeys={lab.foreignKeys} />
        ) : effectiveTab === "trigger" ? (
          <TriggerTabView triggers={lab.triggers} />
        ) : effectiveTab === "info" ? (
          <InfoTabView tableInfo={lab.tableInfo} />
        ) : effectiveTab === "script" ? (
          <ScriptTabView tableDDL={lab.tableDDL} monacoTheme={monacoTheme} />
        ) : (
          <div className="flex items-center justify-center h-full p-16 text-center text-muted-foreground/5 font-black uppercase tracking-[1em] text-[10px]">
            {lab.activeRightTab}
          </div>
        )}
      </div>

      {lab.activeRightTab === "data" && lab.currentTData.length > 0 && (
        <div className="h-11 border-t flex items-center justify-between px-5 bg-muted/5 shrink-0 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <button
              disabled={lab.dataOffset === 0}
              onClick={lab.prevPage}
              className="h-7 w-7 hover:bg-muted rounded-full transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tracking-tighter">
              {lab.dataOffset + 1}-{lab.dataOffset + lab.currentTData.length} OF {lab.tableInfo?.row_count || lab.currentTData.length + (lab.currentTData.length === lab.defaultQueryLimit ? "+" : "")}
            </span>
            <button
              disabled={lab.currentTData.length < lab.defaultQueryLimit}
              onClick={lab.nextPage}
              className="h-7 w-7 hover:bg-muted rounded-full transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 opacity-40" />
            <span>{lab.executionTime || 0}MS</span>
          </div>
        </div>
      )}
    </div>
  );
}
