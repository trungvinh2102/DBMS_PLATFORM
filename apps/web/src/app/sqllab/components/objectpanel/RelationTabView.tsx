/**
 * @file RelationTabView.tsx
 * @description Component for displaying foreign key relationships of a selected table.
 */

import React from "react";
import { ChevronRight } from "lucide-react";

export function RelationTabView({ foreignKeys }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Foreign Keys
      </h4>
      <div className="space-y-3">
        {foreignKeys && foreignKeys.length > 0 ? (
          foreignKeys.map((fk: any) => (
            <div
              key={fk.constraint}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all group"
            >
              <div className="font-bold text-foreground/90 mb-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500/50" />
                {fk.constraint}
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground bg-muted/30 p-2 rounded border border-border/20">
                <span className="font-mono text-[11px] font-bold text-foreground/70">
                  {fk.column}
                </span>
                <ChevronRight className="h-3 w-3 opacity-40" />
                <span className="font-mono text-[11px]">
                  {fk.foreignTable}.{fk.foreignColumn}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
            No foreign keys found
          </div>
        )}
      </div>
    </div>
  );
}
