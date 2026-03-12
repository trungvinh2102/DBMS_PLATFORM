import React, { useMemo, useState } from "react";
import type {
  NodeProps,
  Edge,
  Node,
} from "@xyflow/react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Table, Hash, Maximize2, LayoutGrid } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Custom Table Node Component
const TableNode = ({ data }: any) => {
  return (
    <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden min-w-50 glass animate-in zoom-in-95 duration-500">
      <div className="bg-primary/5 px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-primary" />
          <span className="font-black text-[11px] uppercase tracking-tighter text-foreground">
            {data.label}
          </span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary/30" />
        </div>
      </div>
      
      <div className="p-2 space-y-0.5 bg-background/50 backdrop-blur-sm max-h-[300px] overflow-y-auto scrollbar-none">
        {data.columns.map((col: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted transition-colors group">
            <div className="flex items-center gap-2 overflow-hidden">
              <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-bold text-foreground truncate">{col.name}</span>
            </div>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest ml-4">{col.type}</span>
          </div>
        ))}
      </div>
      
      {/* Handles for connections */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary border-2 border-background" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary border-2 border-background" />
      <Handle type="target" position={Position.Top} className="left-1/2! w-3 h-3 bg-primary border-2 border-background" />
      <Handle type="source" position={Position.Bottom} className="left-1/2! w-3 h-3 bg-primary border-2 border-background" />
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

interface SchemaVisualizerProps {
  tables: string[];
  columns: Record<string, any[]>;
  foreignKeys: any[];
  databaseName?: string;
}

export function SchemaVisualizer({ tables, columns, foreignKeys, databaseName }: SchemaVisualizerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  
  const currentTheme = (resolvedTheme || theme || "light") as "light" | "dark";

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = tables.map((tableName, index) => ({
      id: tableName,
      type: "table",
      position: { x: (index % 4) * 350, y: Math.floor(index / 4) * 450 },
      data: {
        label: tableName,
        columns: columns[tableName] || [],
      },
    }));

    const edges: Edge[] = foreignKeys.map((fk, index) => ({
      id: `e-${index}`,
      source: fk.table,
      target: fk.foreignTable,
      label: fk.column,
      type: "step",
      animated: true,
      style: { 
        stroke: currentTheme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", 
        strokeWidth: 2 
      },
      labelStyle: { 
        fill: currentTheme === 'dark' ? "#888" : "#666", 
        fontWeight: 700, 
        fontSize: 10 
      },
    }));

    return { nodes, edges };
  }, [tables, columns, foreignKeys, currentTheme]);

  if (!tables.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 p-12 text-center bg-muted/2">
        <Table className="h-12 w-12 mb-6" />
        <p className="text-sm font-black uppercase tracking-widest">No Tables Found</p>
        <p className="text-xs mt-2 font-medium">Select a schema to visualize its structure.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background relative overflow-hidden">
      <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border rounded-full px-4 py-1.5 shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            {databaseName || "Database"}
          </span>
        </div>

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

      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          colorMode={currentTheme}
        >
          <Background gap={24} size={1} color="currentColor" className="opacity-[0.03] dark:opacity-[0.07]" />
          <Controls className="bg-background border border-border shadow-xl fill-foreground!" />
        </ReactFlow>
      </div>
      
      <div className="absolute bottom-4 right-4 z-40 bg-background/80 backdrop-blur-md border border-border rounded-full px-4 py-2 shadow-2xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            {tables.length} {tables.length === 1 ? 'Table' : 'Tables'} Connected
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {foreignKeys.length} {foreignKeys.length === 1 ? 'Relationship' : 'Relationships'}
          </span>
        </div>
      </div>

      <SchemaDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        nodes={nodes}
        edges={edges}
        theme={currentTheme}
      />
    </div>
  );
}

function SchemaDetailsDialog({
  open,
  onOpenChange,
  nodes,
  edges,
  theme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: any[];
  edges: any[];
  theme: 'light' | 'dark';
}) {
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
          >
            <Background gap={24} size={1} color="currentColor" className="opacity-[0.03] dark:opacity-[0.07]" />
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

