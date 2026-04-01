/**
 * @file SQLLabDataTable.tsx
 * @description Virtualized data table for displaying SQL query results with support for search and JSON inspection.
 */

import React, { useState, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, Terminal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/use-settings-store";
import { JsonTreeNode } from "./datatable/JsonTreeNode";

interface SQLLabDataTableProps {
  columns: string[];
  data: any[];
  mini?: boolean;
  editable?: boolean;
  onSave?: (changes: Record<number, any>) => void;
  columnMetadata?: any[];
}

/**
 * High-performance virtualized table component for database query results.
 */
export function SQLLabDataTable({
  columns,
  data,
  mini,
  editable,
  onSave,
  columnMetadata,
}: SQLLabDataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { showNullAs } = useSettingsStore();
  const [selectedJson, setSelectedJson] = useState<{
    key: string;
    value: any;
  } | null>(null);

  // Editing state
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    colName: string;
  } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<number, any>>({});
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(term),
      ),
    );
  }, [data, searchTerm]);

  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (mini ? 32 : 40),
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const displayValue = (val: any) => {
    if (val === null) return showNullAs;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const isColumnEditable = (colName: string) => {
    if (!editable) return false;
    const meta = columnMetadata?.find((c) => c.name === colName);
    // Avoid editing primary keys or autoincrement fields if possible
    if (meta?.primary_key || meta?.autoincrement) return false;
    return true;
  };

  const handleCellChange = (rowIndex: number, colName: string, value: any) => {
    setPendingChanges((prev) => {
      const rowChanges = prev[rowIndex] || { ...data[rowIndex] };
      return {
        ...prev,
        [rowIndex]: {
          ...rowChanges,
          [colName]: value,
        },
      };
    });
  };

  const getCellValue = (rowIndex: number, colName: string) => {
    if (pendingChanges[rowIndex] && colName in pendingChanges[rowIndex]) {
      return pendingChanges[rowIndex][colName];
    }
    return data[rowIndex][colName];
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // Keyboard shortcut for saving
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          setIsConfirmSaveOpen(true);
        } else {
          toast.info("No changes to save");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {!mini && (
        <div className="p-2 border-b bg-muted/5 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search in results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-7 pl-8 pr-7 bg-muted/20 border border-border/40 rounded text-[11px] focus:outline-none focus:border-primary/40 focus:bg-background transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest px-2">
            {filteredData.length} of {data.length} rows
          </div>
        </div>
      )}
      <div
        ref={parentRef}
        className="flex-1 relative overflow-auto scrollbar-thin bg-background"
      >
        <table className="w-full text-sm border-collapse table-fixed min-w-full font-mono">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-md shadow-sm z-50">
            <tr>
              <th className="border-b border-r p-1 text-[9px] text-muted-foreground font-black w-12 text-center bg-muted/20 sticky left-0 z-51 uppercase tracking-tighter">
                #
              </th>
              {columns.map((col, i) => (
                <th
                  key={`${col}-${i}`}
                  className={cn(
                    "border-b border-r pt-3 pb-2 px-3 text-left font-black text-[11px] bg-muted/5 w-45 transition-colors hover:bg-muted/10 group truncate select-text uppercase tracking-tighter",
                    mini ? "px-2 w-37.5" : "px-3",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate">{col}</span>
                    <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30 shrink-0" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {virtualRows.length > 0 && virtualRows[0].start > 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{ height: `${virtualRows[0].start}px` }}
                />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const i = virtualRow.index;
              const row = filteredData[i];
              return (
                <tr
                  key={virtualRow.key}
                  data-index={i}
                  className="hover:bg-primary/4 group transition-all duration-75 odd:bg-muted/5"
                  style={{ height: `${virtualRow.size}px` }}
                >
                  <td className="border-r p-1.5 text-[10px] text-muted-foreground/60 font-black text-center sticky left-0 bg-background group-hover:bg-background/80 z-1 transition-colors">
                    {i + 1}
                  </td>
                  {columns.map((col, j) => {
                    const val = getCellValue(i, col);
                    const isEdited =
                      pendingChanges[i] && col in pendingChanges[i];
                    const isObject = val !== null && typeof val === "object";
                    const isEditing =
                      editingCell?.rowIndex === i &&
                      editingCell?.colName === col;

                    return (
                      <td
                        key={j}
                        className={cn(
                          "border-r p-2 text-[11px] font-medium truncate w-45 border-border/20 transition-all select-text relative",
                          mini ? "p-1.5 w-37.5" : "p-2.5",
                          isObject &&
                            "cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors",
                          isEdited && !isEditing && "bg-amber-500/10",
                          isEditing && "p-0",
                        )}
                        title={isEditing ? "" : displayValue(val)}
                        onDoubleClick={() => {
                          if (isObject) {
                            setSelectedJson({ key: col, value: val });
                          }
                        }}
                        onClick={() => {
                          if (isColumnEditable(col)) {
                            if (!isObject) {
                              setEditingCell({ rowIndex: i, colName: col });
                            }
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="w-full h-full bg-background border-2 border-primary px-2 py-1 outline-none text-[11px]"
                            value={val === null ? "" : String(val)}
                            onChange={(e) =>
                              handleCellChange(i, col, e.target.value)
                            }
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingCell(null);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                          />
                        ) : (
                          <div className="truncate">
                            {val === null ? (
                              <span className="text-muted-foreground/40 italic font-black uppercase tracking-widest text-[9px]">
                                {showNullAs}
                              </span>
                            ) : typeof val === "boolean" ? (
                              <span
                                className={cn(
                                  "text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter",
                                  val
                                    ? "text-emerald-700 bg-emerald-100/50"
                                    : "text-red-700 bg-red-100/50",
                                )}
                              >
                                {String(val)}
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "text-foreground/90",
                                  isEdited && "text-amber-600 font-bold",
                                )}
                              >
                                {displayValue(val)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {virtualRows.length > 0 &&
              totalSize - virtualRows[virtualRows.length - 1].end > 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    style={{
                      height: `${totalSize - virtualRows[virtualRows.length - 1].end}px`,
                    }}
                  />
                </tr>
              )}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/20">
            <Search className="h-8 w-8 mb-4 opacity-10" />
            <p className="text-[10px] uppercase font-black tracking-widest">
              No matching rows found
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedJson}
        onOpenChange={(open) => !open && setSelectedJson(null)}
      >
        <DialogContent className="w-[50vw]! max-w-[50vw]! max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-4 bg-muted/20 border-b">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded">
                <Terminal className="h-4 w-4 text-primary" />
              </div>
              JSON Preview: {selectedJson?.key}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-background p-6 scrollbar-thin">
            <div className="font-mono text-xs select-text">
              <JsonTreeNode
                name="root"
                value={selectedJson?.value}
                isLast={true}
              />
            </div>
          </div>
          <div className="p-4 bg-muted/10 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-black text-[10px] tracking-widest uppercase h-8"
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(selectedJson?.value, null, 2),
                );
                toast.success("Copied to clipboard");
              }}
            >
              Copy JSON
            </Button>
            <Button
              variant="default"
              size="sm"
              className="font-black text-[10px] tracking-widest uppercase h-8"
              onClick={() => setSelectedJson(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isConfirmSaveOpen}
        onOpenChange={setIsConfirmSaveOpen}
      >
        <DialogContent className="w-[400px] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-4 bg-amber-500/10 border-b">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-amber-700">
              <div className="p-1.5 bg-amber-500/20 rounded">
                <Terminal className="h-4 w-4 text-amber-600" />
              </div>
              Confirm Changes
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-xs text-muted-foreground leading-relaxed">
            <p className="mb-4">
              You are about to save changes to{" "}
              <span className="font-black text-foreground">
                {Object.keys(pendingChanges).length}
              </span>{" "}
              rows. This will execute update queries on the database.
            </p>
            <div className="max-h-[200px] overflow-auto bg-muted/20 rounded border p-2 scrollbar-thin">
              {Object.entries(pendingChanges).map(([rowIndex, changes]) => (
                <div key={rowIndex} className="mb-2 last:mb-0">
                  <div className="font-black text-[9px] uppercase tracking-tighter text-muted-foreground">
                    Row #{parseInt(rowIndex) + 1}
                  </div>
                  {Object.entries(changes as any).map(([col, newVal]) => {
                    const oldVal = data[parseInt(rowIndex)][col];
                    if (oldVal === newVal) return null;
                    return (
                      <div key={col} className="flex items-center gap-1 pl-2">
                        <span className="text-muted-foreground">{col}:</span>
                        <span className="line-through opacity-50">
                          {String(oldVal)}
                        </span>
                        <ChevronDown className="h-3 w-3 -rotate-90 opacity-40" />
                        <span className="text-amber-600 font-bold">
                          {String(newVal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-4 text-red-500/70 font-bold uppercase text-[9px] tracking-widest">
              CAUTION: This action cannot be undone.
            </p>
          </div>
          <div className="p-4 bg-muted/10 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-black text-[10px] tracking-widest uppercase h-8"
              onClick={() => setIsConfirmSaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="font-black text-[10px] tracking-widest uppercase h-8 bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                onSave?.(pendingChanges);
                setPendingChanges({});
                setIsConfirmSaveOpen(false);
                toast.success("Changes sent to database");
              }}
            >
              Confirm Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
