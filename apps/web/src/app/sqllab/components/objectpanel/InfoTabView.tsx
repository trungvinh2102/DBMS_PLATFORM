/**
 * @file InfoTabView.tsx
 * @description Component for displaying table statistics (row count, sizes) in the object panel.
 */

import React from "react";
import { cn } from "@/lib/utils";

export function InfoTabView({ tableInfo }: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          Table Statistics
        </h4>
        <div className="h-px flex-1 bg-border/40 ml-4" />
      </div>
      {tableInfo ? (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Row Count", value: tableInfo.row_count, color: "text-blue-500" },
            { label: "Total Size", value: tableInfo.total_size, color: "text-purple-500" },
            { label: "Data Size", value: tableInfo.data_size, color: "text-emerald-500" },
            { label: "Index Size", value: tableInfo.index_size, color: "text-orange-500" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all group"
            >
              <div className="text-[10px] opacity-60 uppercase font-black tracking-wider mb-1 group-hover:opacity-100 transition-opacity">
                {item.label}
              </div>
              <div className={cn("text-lg font-mono font-bold mt-1 tracking-tight", item.color)}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
          No info available
        </div>
      )}
    </div>
  );
}
