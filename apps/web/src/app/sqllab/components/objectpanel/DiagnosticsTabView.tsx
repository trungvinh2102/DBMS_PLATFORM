/**
 * @file DiagnosticsTabView.tsx
 * @description Tab for displaying advanced statistical profiling (DuckDB SUMMARIZE or SQLite basic stats).
 */

import React, { useEffect, useState } from "react";
import { databaseApi } from "@/lib/api-client";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DiagnosticsTabView({ databaseId, table }: { databaseId: string; table: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiagnostics() {
      setLoading(true);
      setError(null);
      try {
        const res = await databaseApi.getDiagnostics(databaseId, table);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load diagnostics");
      } finally {
        setLoading(false);
      }
    }

    if (databaseId && table) {
      fetchDiagnostics();
    }
  }, [databaseId, table]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 text-muted-foreground/30">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analyzing Data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center text-red-500/60">
        <AlertCircle className="h-8 w-8 mb-4 opacity-40" />
        <div className="text-xs font-bold uppercase tracking-tight mb-2">Analysis Failed</div>
        <div className="text-[10px] max-w-xs leading-relaxed opacity-80">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-16 text-center text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.1em]">
        No diagnostic data available for this object.
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          Data Profiling
        </h4>
        <div className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
          {data.length} Fields
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <tr className="border-b bg-muted/10">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-r last:border-r-0"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-b transition-colors hover:bg-muted/30 group"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className={cn(
                      "px-4 py-2.5 text-[11px] font-mono border-r last:border-r-0 tracking-tight",
                      col === "column_name" ? "font-bold text-foreground" : "text-muted-foreground/80"
                    )}
                  >
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(4);
  }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}
