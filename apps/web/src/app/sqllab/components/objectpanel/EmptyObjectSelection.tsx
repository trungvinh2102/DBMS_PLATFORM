/**
 * @file EmptyObjectSelection.tsx
 * @description Placeholder component shown when no object is selected in the SQL Lab object panel.
 */

import React from "react";
import { Info } from "lucide-react";

export function EmptyObjectSelection() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <div className="flex flex-col items-center justify-center p-16 gap-6 rounded-3xl border-2 border-dashed border-border/40 bg-muted/5 max-w-sm mx-auto transition-all hover:bg-muted/10 group">
        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <Info className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60">
            Select an Object
          </p>
          <p className="text-[10px] text-muted-foreground/40 font-medium px-4">
            Pick a table or view from the sidebar to explore its structure and data.
          </p>
        </div>
      </div>
    </div>
  );
}
