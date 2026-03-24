/**
 * @file SchemaDetailsDialog.tsx
 * @description Dialog component for viewing the full-screen interactive ER diagram.
 */

import React from "react";
import { ReactFlow, Background, BackgroundVariant, Controls } from "@xyflow/react";
import { LayoutGrid } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SchemaDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: any[];
  edges: any[];
  nodeTypes: any;
  theme: 'light' | 'dark';
}

export function SchemaDetailsDialog({
  open,
  onOpenChange,
  nodes,
  edges,
  nodeTypes,
  theme,
}: SchemaDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw]! w-400! sm:max-w-none h-[92vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl bg-background">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tighter">
                Schema Visualizer
              </DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                Interactive Database ER Diagram
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            colorMode={theme}
            proOptions={{ hideAttribution: true }}
            panActivationKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            deleteKeyCode={null}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.5} 
              color={theme === 'dark' ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"} 
            />
            <Controls className="bg-background border border-border shadow-xl fill-foreground!" />
          </ReactFlow>
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/50 flex justify-end shrink-0">
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
