/**
 * @file DataTablePreview.tsx
 * @description Renders a truncated grid for the user to verify the SQL result directly.
 */

import React from "react";
import { Sparkles } from "lucide-react";

interface DataTablePreviewProps {
  columns: string[];
  data: any[];
}

/**
 * DataTablePreview Component
 * Displays the first 5 rows and columns of a dataset to provide a quick glance at AI results.
 */
export const DataTablePreview = ({ columns, data }: DataTablePreviewProps) => (
  <div className="mt-4 p-2.5 rounded-2xl bg-muted/20 border border-primary/10 glass-v2 overflow-hidden">
    <div className="flex items-center gap-2 mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-primary/70">
      <Sparkles className="h-3 w-3" />
      Sample Results Preview (Top 5)
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {columns.slice(0, 5).map(col => (
              <th key={col} className="p-1.5 text-[9px] font-bold text-muted-foreground border-b border-border/50 truncate max-w-25">{col}</th>
            ))}
            {columns.length > 5 && <th className="p-1.5 text-[9px] font-bold text-muted-foreground border-b border-border/50 italic opacity-50">+ {columns.length - 5} more</th>}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 5).map((row, idx) => (
            <tr key={idx} className="hover:bg-primary/5 transition-colors">
              {columns.slice(0, 5).map(col => (
                <td key={col} className="p-1.5 text-[10px] text-muted-foreground/80 truncate max-w-25 border-b border-border/20">{row[col]}</td>
              ))}
              {columns.length > 5 && <td className="p-1.5 border-b border-border/20" />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mt-2 text-[8px] text-muted-foreground/60 italic px-1">
      Showing top 5 of {data.length} records. Open in SQL Lab for full results.
    </div>
  </div>
);
