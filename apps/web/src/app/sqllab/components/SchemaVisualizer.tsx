/**
 * @file SchemaVisualizer.tsx
 * @description Main component for database schema visualization using React Flow and Dagre.
 */

import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Table, Maximize2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// Internal Components & Utilities
import { TableNode } from "./schemavisualizer/TableNode";
import { SchemaDetailsDialog } from "./schemavisualizer/SchemaDetailsDialog";
import { getLayoutedElements } from "./schemavisualizer/layout";

const nodeTypes = {
  table: TableNode,
};

interface SchemaVisualizerProps {
  tables: string[];
  columns: Record<string, any[]>;
  foreignKeys: any[];
  databaseName?: string;
}

export function SchemaVisualizer({
  tables,
  columns,
  foreignKeys,
  databaseName,
}: SchemaVisualizerProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  const currentTheme = (resolvedTheme || theme || "light") as "light" | "dark";

  const { nodes, edges } = useMemo(() => {
    const rawNodes: Node[] = tables.map((tableName) => ({
      id: tableName,
      type: "table",
      position: { x: 0, y: 0 },
      data: {
        label: tableName,
        columns: columns[tableName] || [],
      },
    }));

    const rawEdges: Edge[] = foreignKeys.map((fk, index) => ({
      id: `e-${index}`,
      source: fk.table,
      target: fk.foreignTable,
      label: fk.column,
      type: "step",
      animated: true,
      style: {
        stroke:
          currentTheme === "dark"
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.2)",
        strokeWidth: 2,
      },
      labelStyle: {
        fill: currentTheme === "dark" ? "#888" : "#666",
        fontWeight: 700,
        fontSize: 10,
      },
    }));

    // Apply Dagre Layout
    return getLayoutedElements(rawNodes, rawEdges);
  }, [tables, columns, foreignKeys, currentTheme]);

  if (!tables.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 p-12 text-center bg-muted/2">
        <Table className="h-12 w-12 mb-6" />
        <p className="text-sm font-black uppercase tracking-widest">
          No Tables Found
        </p>
        <p className="text-xs mt-2 font-medium">
          Select a schema to visualize its structure.
        </p>
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
            color={
              currentTheme === "dark"
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.2)"
            }
          />
          <Controls className="bg-background border border-border shadow-xl fill-foreground!" />
        </ReactFlow>
      </div>

      <div className="absolute bottom-4 right-4 z-40 bg-background/80 backdrop-blur-md border border-border rounded-full px-4 py-2 shadow-2xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            {tables.length} {tables.length === 1 ? "Table" : "Tables"} Connected
          </span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {foreignKeys.length}{" "}
            {foreignKeys.length === 1 ? "Relationship" : "Relationships"}
          </span>
        </div>
      </div>

      <SchemaDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        theme={currentTheme}
      />
    </div>
  );
}
