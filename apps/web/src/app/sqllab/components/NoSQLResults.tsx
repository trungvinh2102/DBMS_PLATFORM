/**
 * @file NoSQLResults.tsx
 * @description Component for displaying NoSQL query results (e.g., MongoDB, Redis) as expandable JSON documents with search support.
 */

"use client";

import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { NoSQLDocumentNode } from "./datatable/NoSQLDocumentNode";

interface NoSQLResultsProps {
  data: any[];
}

/**
 * Renders a list of NoSQL documents with search and recursive inspection capabilities.
 */
export function NoSQLResults({ data }: NoSQLResultsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((doc) => {
      const str = JSON.stringify(doc).toLowerCase();
      return str.includes(term);
    });
  }, [data, searchTerm]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 italic text-sm">
        No documents found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden font-mono">
      <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-9 pr-8 bg-muted/50 border border-border rounded-md text-[11px] text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-muted transition-all font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest whitespace-nowrap">
          {filteredData.length} of {data.length} docs
        </div>
      </div>
      <div className="flex-1 overflow-auto select-none p-4 custom-scrollbar">
        {filteredData.length > 0 ? (
          filteredData.map((doc, idx) => (
            <NoSQLDocumentNode
              key={idx}
              data={doc}
              index={idx}
              isRoot
              searchTerm={searchTerm}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/20">
            <Search className="h-8 w-8 mb-4 opacity-10" />
            <p className="text-[10px] uppercase font-black tracking-widest">
              No matches found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
