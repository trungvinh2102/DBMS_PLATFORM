/**
 * @file LineageFlow.tsx
 * @description Reusable ReactFlow component for lineage visualization.
 */

import React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./LineageNodes";
import { useTheme } from "next-themes";

interface LineageFlowProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}

export function LineageFlow({
  nodes,
  edges,
  className = "",
}: LineageFlowProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = (resolvedTheme || theme || "light") as
    | "light"
    | "dark"
    | "system";

  return (
    <div className={`w-full h-full relative ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-dot-pattern"
        minZoom={0.1}
        maxZoom={4}
        colorMode={currentTheme === "system" ? "system" : currentTheme}
        proOptions={{ hideAttribution: true }}
        panActivationKeyCode={null}
      >
        <Background />
        <Controls className="bg-background! border-border! shadow-none! [&_path]:fill-foreground!" />
      </ReactFlow>
    </div>
  );
}
