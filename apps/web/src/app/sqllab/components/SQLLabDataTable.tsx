/**
 * @file SQLLabDataTable.tsx
 * @description Data table component for SQL Lab with JSON preview support.
 */

import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { ChevronDown, ChevronRight, Terminal } from "lucide-react";
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

interface JsonTreeNodeProps {
  name?: string;
  value: any;
  isLast?: boolean;
}

export function JsonTreeNode({
  name,
  value,
  isLast = true,
}: JsonTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderValue = () => {
    if (value === null) return <span className="text-[#d93025]">null</span>;
    if (typeof value === "boolean")
      return <span className="text-[#e67700]">{String(value)}</span>;
    if (typeof value === "number")
      return <span className="text-[#e67700]">{value}</span>;
    if (typeof value === "string") {
      // Mask password if key name suggests sensitive data
      const isSensitiveKey =
        name &&
        ["password", "token", "secret", "key"].includes(name.toLowerCase());
      if (isSensitiveKey) {
        return <span className="text-[#188339]">"********"</span>;
      }

      // Mask password in URI if detected
      const maskedValue = value.replace(/(:\/\/.*:)(.*)(@.*)/, "$1****$3");
      return <span className="text-[#188339]">"{maskedValue}"</span>;
    }
    return null;
  };

  if (!isObject) {
    return (
      <div className="flex items-start gap-1 py-0.5 px-4 hover:bg-muted/50 transition-colors group">
        {name && (
          <span className="text-[#1a73e8] font-bold shrink-0">{name}:</span>
        )}
        <span className="break-all">{renderValue()}</span>
        {!isLast && <span className="text-muted-foreground/40">,</span>}
      </div>
    );
  }

  const keys = Object.keys(value);
  const isEmpty = keys.length === 0;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-1 py-0.5 px-2 hover:bg-muted/50 rounded cursor-pointer transition-colors group"
        onClick={toggle}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {!isEmpty && (
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground/60 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          )}
        </div>
        {name && <span className="text-[#1a73e8] font-bold">{name}:</span>}
        <span className="text-muted-foreground/60 flex items-center gap-1.5">
          {isArray ? (
            <>
              <span className="text-foreground/40">[]</span>
              <span className="text-[10px] font-bold italic">
                {keys.length} item{keys.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <span className="text-foreground/40">{"{}"}</span>
              <span className="text-[10px] font-bold italic">
                {keys.length} key{keys.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </span>
      </div>

      {isExpanded && !isEmpty && (
        <div className="ml-5 border-l border-muted-foreground/10 flex flex-col">
          {keys.map((key, index) => (
            <JsonTreeNode
              key={key}
              name={isArray ? undefined : key}
              value={value[key]}
              isLast={index === keys.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SQLLabDataTableProps {
  columns: string[];
  data: any[];
  mini?: boolean;
}

export function SQLLabDataTable({ columns, data, mini }: SQLLabDataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (mini ? 32 : 40),
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const { showNullAs } = useSettingsStore();

  const [selectedJson, setSelectedJson] = useState<{
    key: string;
    value: any;
  } | null>(null);

  const displayValue = (val: any) => {
    if (val === null) return showNullAs;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <>
      <div
        ref={parentRef}
        className="relative overflow-auto h-full scrollbar-thin bg-background"
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
              const row = data[i];
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
                    const val = row[col];
                    const isObject = val !== null && typeof val === "object";

                    return (
                      <td
                        key={j}
                        className={cn(
                          "border-r p-2 text-[11px] font-medium truncate w-45 border-border/20 transition-all select-text",
                          mini ? "p-1.5 w-37.5" : "p-2.5",
                          isObject &&
                            "cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors",
                        )}
                        title={displayValue(val)}
                        onClick={() => {
                          if (isObject) {
                            setSelectedJson({ key: col, value: val });
                          }
                        }}
                      >
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
                            <span className="text-foreground/90">
                              {displayValue(val)}
                            </span>
                          )}
                        </div>
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
    </>
  );
}
