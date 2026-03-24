/**
 * @file StructureTabView.tsx
 * @description Component for displaying and filtering the column structure (name, type) of a database table.
 */

import React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StructureTabView({
  isLoadingColumns,
  columnsData,
  structureSearch,
  setStructureSearch,
}: any) {
  return (
    <div className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
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
                key={`skeleton-${i}`}
                className="h-8 bg-muted animate-pulse rounded w-full"
              />
            ))}
          </div>
        ) : (
          columnsData
            ?.filter(
              (col: any) =>
                !structureSearch ||
                col.name
                  .toLowerCase()
                  .includes(structureSearch.toLowerCase()) ||
                col.type.toLowerCase().includes(structureSearch.toLowerCase()),
            )
            .map((col: any) => (
              <div
                key={col.name}
                className="flex items-center justify-between text-[11px] p-3 bg-muted/20 border border-border/50 rounded-lg hover:bg-muted/40 hover:border-border transition-all group shadow-sm dark:shadow-none dark:border-transparent dark:hover:border-border/60"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary/20 border border-primary/40" />
                  <span className="font-mono font-bold text-foreground/70 tracking-tight">
                    {col.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono font-black opacity-70 border-border/60 bg-muted/10 h-5 px-1.5 group-hover:opacity-100 transition-opacity"
                >
                  {col.type}
                </Badge>
              </div>
            ))
        )}
        {(!columnsData || columnsData.length === 0) && (
          <div className="text-center py-10 opacity-30 text-xs italic">
            No columns found
          </div>
        )}
      </div>
    </div>
  );
}
