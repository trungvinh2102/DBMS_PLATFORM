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
}: SQLLabObjectPanelProps) {
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
          "Table",
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
          <div className="w-px h-4 bg-border/60" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 font-black text-[9px] gap-1.5 opacity-60 hover:opacity-100"
          >
            <Search className="h-3 w-3" />
            FILTER
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-background scrollbar-thin">
        {activeRightTab === "data" ? (
          selectedTable ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-16 text-center gap-6 text-muted-foreground/10">
              <Info className="h-16 w-16" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">
                Pick an Object
              </p>
            </div>
          )
        ) : activeRightTab === "structure" ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
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
            <div className="space-y-1.5">
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
                columnsData?.map((col: any) => (
                  <div
                    key={col.name}
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
