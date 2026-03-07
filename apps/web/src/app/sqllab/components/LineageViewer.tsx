/**
 * @file LineageViewer.tsx
 * @description Main component for analyzing and visualizing SQL lineage using ReactFlow.
 */

"use client";

import React, { useState } from "react";
import {
  Search,
  AlertCircle,
  Maximize2,
  FileText,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLineage } from "../hooks/useLineage";
import { LineageFlow } from "./lineage/LineageFlow";

interface LineageViewerProps {
  sql: string;
}

export function LineageViewer({ sql }: LineageViewerProps) {
  const { nodes, edges, error } = useLineage(sql);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!sql.trim()) {
    return <EmptyState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute top-4 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-md border-border shadow-lg hover:bg-background h-9 px-4 gap-2 rounded-full font-bold uppercase tracking-widest text-[10px]"
          onClick={() => setDetailsOpen(true)}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          View Details
        </Button>
      </div>

      <div className="flex-1 w-full bg-[#fafafa] dark:bg-[#09090b]">
        <LineageFlow nodes={nodes} edges={edges} />
      </div>

      <LineageDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        nodes={nodes}
        edges={edges}
        sql={sql}
      />
    </div>
  );
}

/**
 * Helper component for empty state
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 p-12 text-center bg-muted/2">
      <Search className="h-12 w-12 mb-6" />
      <p className="text-sm font-black uppercase tracking-widest">
        No SQL to Analyze
      </p>
      <p className="text-xs mt-2 font-medium">
        Write an SQL statement to see its lineage.
      </p>
    </div>
  );
}

/**
 * Helper component for error state
 */
function ErrorState({ error }: { error: string }) {
  return (
    <div className="p-8">
      <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-5 text-xs font-mono text-amber-700 dark:text-amber-400 shadow-sm flex gap-4 items-start">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold mb-1 uppercase tracking-wider">
            Lineage Analysis Unavailable
          </p>
          <p className="opacity-80">{error}</p>
          <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-900/50">
            <p className="font-bold mb-2 uppercase text-[10px]">
              Tips for better analysis:
            </p>
            <ul className="list-disc list-inside space-y-1 opacity-70">
              <li>Ensure SQL syntax is correct</li>
              <li>Avoid complex vendor-specific extensions</li>
              <li>Try simple SELECT, INSERT, or JOIN statements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dialog component for detailed lineage view
 */
function LineageDetailsDialog({
  open,
  onOpenChange,
  nodes,
  edges,
  sql,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: any[];
  edges: any[];
  sql: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw]! w-400! sm:max-w-none h-[92vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl bg-background">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tighter">
                Lineage Analysis
              </DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                Interactive flow and statement details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <LineageFlow nodes={nodes} edges={edges} />
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/50 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            className="font-bold uppercase tracking-widest text-[10px] rounded-full px-8"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
