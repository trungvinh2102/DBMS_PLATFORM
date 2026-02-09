/**
 * @file SQLLabHistoryPanel.tsx
 * @description Panel showing the history of executed SQL queries.
 */

import {
  Clock,
  Database,
  Play,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Copy,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

interface SQLLabHistoryPanelProps {
  onSelectQuery: (sql: string) => void;
  selectedDS?: string;
  selectedSchema?: string;
}

export function SQLLabHistoryPanel({
  onSelectQuery,
  selectedDS,
  selectedSchema,
}: SQLLabHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: history,
    isLoading,
    refetch,
  } = useQuery(
    trpc.database.getQueryHistory.queryOptions({
      databaseId: selectedDS,
      limit: 100,
    }),
  );

  const filteredHistory = (history as unknown as any[])?.filter((h: any) => {
    const matchesSearch =
      h.sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.database.databaseName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredHistory?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("SQL copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">
            Query History
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-8 w-8 p-0"
        >
          <Clock className="h-4 w-4 opacity-50" />
        </Button>
      </div>

      {/* Breadcrumb - Matches ObjectPanel style */}
      <div className="flex items-center h-10 px-5 bg-background border-b text-[10px] text-muted-foreground/60 gap-2 shrink-0 font-bold uppercase tracking-tight">
        <Database className="h-3.5 w-3.5 opacity-40 shrink-0" />
        <span className="text-foreground/80 truncate">
          {selectedSchema || "public"}
        </span>
      </div>

      {/* Search */}
      <div className="p-3 border-b bg-muted/5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            className="pl-8 h-8 text-[11px] font-medium bg-background border-none focus-visible:ring-1 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-20">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Loading History
            </span>
          </div>
        ) : filteredHistory && filteredHistory.length > 0 ? (
          <div
            className="divide-y divide-border/40 relative w-full"
            style={{ height: `${totalSize}px` }}
          >
            {virtualItems.map((virtualRow) => {
              const item = filteredHistory[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  className="p-4 hover:bg-muted/30 transition-all group border-l-2 border-transparent hover:border-primary absolute top-0 left-0 w-full"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {item.status === "SUCCESS" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span className="text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tighter text-foreground/70">
                          <Database className="h-3 w-3 opacity-40 text-blue-500" />
                          {item.database.databaseName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(item.created_on), {
                            addSuffix: true,
                          })}
                        </span>
                        <span>•</span>
                        <span>{item.executionTime}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(item.sql)}
                        title="Copy SQL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => onSelectQuery(item.sql)}
                        title="Open in Editor"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <pre className="text-[11px] font-mono p-3 bg-muted/40 rounded-lg overflow-hidden line-clamp-3 text-muted-foreground/80 group-hover:text-foreground/90 transition-colors border border-transparent group-hover:border-border/60">
                      {item.sql}
                    </pre>
                  </div>

                  {item.errorMessage && (
                    <p className="mt-2 text-[10px] text-red-500/80 font-medium italic line-clamp-1 border-l-2 border-red-500/20 pl-2">
                      {item.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-12 text-center gap-6 opacity-10">
            <Clock className="h-16 w-16" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">
              No Query History
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
