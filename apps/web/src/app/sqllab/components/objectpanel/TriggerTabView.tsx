/**
 * @file TriggerTabView.tsx
 * @description Component for listing triggers associated with a database table.
 */

import React from "react";

export function TriggerTabView({ triggers }: any) {
  return (
    <div className="p-5">
      <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-4">
        Triggers
      </h4>
      <div className="space-y-3">
        {triggers && triggers.length > 0 ? (
          triggers.map((trg: any) => (
            <div
              key={trg}
              className="p-4 bg-muted/20 border border-border/50 rounded-lg shadow-sm dark:shadow-none hover:bg-muted/30 transition-all flex items-center gap-3"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/50" />
              <div className="font-bold text-[11px] tracking-tight text-foreground/90">
                {trg}
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground/40 text-xs italic p-10 text-center border border-dashed border-border/40 rounded-lg bg-muted/5">
            No triggers found
          </div>
        )}
      </div>
    </div>
  );
}
