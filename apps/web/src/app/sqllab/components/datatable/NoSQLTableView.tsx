/**
 * @file NoSQLTableView.tsx
 * @description Scannable tabular representation for heterogeneous NoSQL (e.g. MongoDB) query results.
 */

"use client";

import React, { useMemo } from "react";

interface NoSQLTableViewProps {
  data: Record<string, any>[];
}

function renderCellValue(value: any) {
  if (value === undefined) {
    return <span className="text-muted-foreground/30 italic font-mono">—</span>;
  }
  if (value === null) {
    return (
      <span className="text-pink-600 dark:text-pink-400 font-mono italic">
        null
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span className="text-blue-600 dark:text-blue-400 font-mono">
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className="text-amber-600 dark:text-amber-400 font-mono">
        {value}
      </span>
    );
  }
  if (typeof value === "string") {
    return (
      <span
        className="text-foreground/90 font-mono truncate block max-w-xs"
        title={value}
      >
        {value}
      </span>
    );
  }
  if (typeof value === "object") {
    const serialized = JSON.stringify(value);
    return (
      <span
        className="text-muted-foreground font-mono truncate block max-w-xs"
        title={serialized}
      >
        {serialized}
      </span>
    );
  }
  return <span className="font-mono text-foreground">{String(value)}</span>;
}

export function NoSQLTableView({ data }: NoSQLTableViewProps) {
  const columns = useMemo(() => {
    const colSet = new Set<string>();
    let hasId = false;

    for (const doc of data) {
      if (doc && typeof doc === "object" && !Array.isArray(doc)) {
        for (const key of Object.keys(doc)) {
          if (key === "_id") {
            hasId = true;
          } else {
            colSet.add(key);
          }
        }
      }
    }

    const remaining = Array.from(colSet);
    return hasId ? ["_id", ...remaining] : remaining;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 italic text-xs font-mono">
        No documents to display
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 italic text-xs font-mono">
        No tabular columns found in documents
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-auto custom-scrollbar p-3 select-text"
      data-testid="nosql-table-view"
    >
      <div className="border border-border rounded-md overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-xs font-mono border-collapse">
            <thead className="[&_tr]:border-b bg-muted/40 sticky top-0 z-10">
              <tr>
                <th
                  scope="col"
                  className="h-8 px-3 text-left align-middle font-medium text-muted-foreground text-[11px] w-12 border-r border-border/40 select-text"
                >
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="h-8 px-3 text-left align-middle font-semibold text-foreground border-r border-border/40 last:border-r-0 whitespace-nowrap select-text"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {data.map((doc, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-muted/30 border-b border-border/40 transition-colors leading-snug"
                >
                  <td className="p-2 px-3 align-middle text-muted-foreground/60 text-[11px] border-r border-border/40 select-text">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="p-2 px-3 align-middle whitespace-nowrap text-xs border-r border-border/40 last:border-r-0 select-text max-w-md"
                    >
                      {renderCellValue(doc ? doc[col] : undefined)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
