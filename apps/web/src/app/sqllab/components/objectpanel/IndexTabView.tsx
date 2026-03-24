/**
 * @file IndexTabView.tsx
 * @description Component for displaying database table indexes and their definitions.
 */

import React from "react";

export function IndexTabView({ indexes }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Indexes
      </h4>
      <div className="space-y-3">
        {indexes && indexes.length > 0 ? (
          indexes.map((idx: any) => (
            <div
              key={idx.indexname}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all group"
            >
              <div className="font-bold text-foreground/90 mb-1.5 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50" />
                {idx.indexname}
              </div>
              <div className="font-mono text-muted-foreground text-[10px] break-all bg-muted/30 p-2 rounded border border-border/20">
                {idx.indexdef}
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
            No indexes found
          </div>
        )}
      </div>
    </div>
  );
}
