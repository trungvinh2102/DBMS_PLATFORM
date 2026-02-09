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

interface SQLLabObjectPanelProps {
  activeRightTab: string;
  setActiveRightTab: (tab: string) => void;
  selectedSchema: string;
  selectedTable: string | null;
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
}

export function SQLLabObjectPanel({
  activeRightTab,
  setActiveRightTab,
  selectedSchema,
  selectedTable,
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
}: SQLLabObjectPanelProps) {
  const [structureSearch, setStructureSearch] = useState("");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center h-10 border-b overflow-x-auto no-scrollbar bg-muted/5 shrink-0">
        {[
          "Data",
          "Structure",
          "Index",
          "Relation",
          "Trigger",
          "Info",
          "Script",
        ].map((t) => (
          <button
            key={t}
            onClick={() => setActiveRightTab(t.toLowerCase())}
            className={cn(
              "px-5 h-full text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
              activeRightTab === t.toLowerCase()
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
        <Table className="h-3.5 w-3.5 opacity-40 shrink-0" />
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
          {activeRightTab === "data" && currentTData.length > 0 && (
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
          <div className="flex flex-col items-center justify-center h-full p-16 text-center gap-6 text-muted-foreground/10">
            <Info className="h-16 w-16" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">
              Pick an Object
            </p>
          </div>
        ) : activeRightTab === "data" ? (
          loadingTData ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin opacity-20" />
            </div>
          ) : currentTData.length > 0 ? (
            <SQLLabDataTable
              columns={currentTColumns}
              data={currentTData}
              mini
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-4 text-muted-foreground/20">
              <Database className="h-10 w-10" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                No Data Preview
              </p>
            </div>
          )
        ) : activeRightTab === "structure" ? (
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                Schema Definition
              </h4>
              <Badge
                variant="outline"
                className="text-[9px] font-black h-5 rounded-sm px-2 border-primary/20 text-primary/60"
              >
                DDL
              </Badge>
            </div>

            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search columns..."
                className="w-full h-8 pl-8 pr-3 text-[11px] bg-muted/20 border border-border/40 rounded-md focus:outline-none focus:border-primary/40 focus:bg-background transition-colors"
                value={structureSearch}
                onChange={(e) => setStructureSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {isLoadingColumns ? (
                <div className="space-y-3 opacity-20">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="h-8 bg-muted animate-pulse rounded w-full"
                    />
                  ))}
                </div>
              ) : (
                columnsData
                  ?.filter((col: any) => col.table === selectedTable)
                  .filter(
                    (col: any) =>
                      !structureSearch ||
                      col.name
                        .toLowerCase()
                        .includes(structureSearch.toLowerCase()) ||
                      col.type
                        .toLowerCase()
                        .includes(structureSearch.toLowerCase()),
                  )
                  .map((col: any, i: number) => (
                    <div
                      key={`${col.name}-${i}`}
                      className="flex items-center justify-between text-[11px] p-3 bg-muted/20 border border-transparent rounded-lg hover:bg-muted/40 hover:border-border/60 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary/20 border border-primary/40" />
                        <span className="font-mono font-bold text-foreground/70 tracking-tight">
                          {col.name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono font-black opacity-40 bg-background h-5 px-1.5 group-hover:opacity-100 transition-opacity"
                      >
                        {col.type}
                      </Badge>
                    </div>
                  ))
              )}
              {columnsData?.filter((col: any) => col.table === selectedTable)
                .length === 0 && (
                <div className="text-center py-10 opacity-30 text-xs italic">
                  No columns found
                </div>
              )}
            </div>
          </div>
        ) : activeRightTab === "index" ? (
          <div className="p-5">
            <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">
              Indexes
            </h4>
            <div className="space-y-2">
              {indexes && indexes.length > 0 ? (
                indexes.map((idx, i) => (
                  <div key={i} className="p-3 bg-muted/20 rounded-lg text-xs">
                    <div className="font-bold mb-1">{idx.indexname}</div>
                    <div className="font-mono text-[10px] opacity-60 break-all">
                      {idx.indexdef}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground/40 text-xs italic">
                  No indexes found
                </div>
              )}
            </div>
          </div>
        ) : activeRightTab === "relation" ? (
          <div className="p-5">
            <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">
              Foreign Keys
            </h4>
            <div className="space-y-2">
              {foreignKeys && foreignKeys.length > 0 ? (
                foreignKeys.map((fk, i) => (
                  <div key={i} className="p-3 bg-muted/20 rounded-lg text-xs">
                    <div className="font-bold mb-1">{fk.constraint}</div>
                    <div className="flex items-center gap-2 opacity-70">
                      <span className="font-mono">{fk.column}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className="font-mono">
                        {fk.foreignTable}.{fk.foreignColumn}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground/40 text-xs italic">
                  No foreign keys found
                </div>
              )}
            </div>
          </div>
        ) : activeRightTab === "trigger" ? (
          <div className="p-5">
            <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">
              Triggers
            </h4>
            <div className="space-y-2">
              {triggers && triggers.length > 0 ? (
                triggers.map((trg, i) => (
                  <div key={i} className="p-3 bg-muted/20 rounded-lg text-xs">
                    <div className="font-bold">{trg}</div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground/40 text-xs italic">
                  No triggers found
                </div>
              )}
            </div>
          </div>
        ) : activeRightTab === "info" ? (
          <div className="p-5">
            <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">
              Table Statistics
            </h4>
            {tableInfo ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-[10px] opacity-50 uppercase font-black">
                    Row Count
                  </div>
                  <div className="text-lg font-mono font-bold mt-1">
                    {tableInfo.row_count}
                  </div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-[10px] opacity-50 uppercase font-black">
                    Total Size
                  </div>
                  <div className="text-lg font-mono font-bold mt-1">
                    {tableInfo.total_size}
                  </div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-[10px] opacity-50 uppercase font-black">
                    Data Size
                  </div>
                  <div className="text-lg font-mono font-bold mt-1">
                    {tableInfo.data_size}
                  </div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-[10px] opacity-50 uppercase font-black">
                    Index Size
                  </div>
                  <div className="text-lg font-mono font-bold mt-1">
                    {tableInfo.index_size}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground/40 text-xs italic">
                No info available
              </div>
            )}
          </div>
        ) : activeRightTab === "script" ? (
          <div className="h-full flex flex-col">
            <div className="p-3 border-b bg-muted/5 flex justify-between items-center">
              <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                DDL Script
              </h4>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono bg-muted/30 p-4 rounded-lg overflow-auto whitespace-pre-wrap select-text">
                {tableDDL || "-- No DDL available"}
              </pre>
            </div>
          </div>
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
