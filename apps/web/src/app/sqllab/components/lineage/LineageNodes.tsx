/**
 * @file LineageNodes.tsx
 * @description Custom ReactFlow nodes for the Lineage visualization.
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Database, Table, Zap } from "lucide-react";

export const SourceNode = ({ data }: any) => (
  <div className="px-4 py-3 bg-background border-2 border-blue-500/30 rounded-xl shadow-xl min-w-45 group transition-all hover:border-blue-500/60">
    <Handle
      type="source"
      position={Position.Right}
      className="bg-blue-500! w-3! h-3!"
    />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
        <Database className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Source Table
        </span>
        <span className="text-xs font-bold truncate max-w-30">
          {data.label}
        </span>
      </div>
    </div>
  </div>
);

export const TransformNode = ({ data }: any) => (
  <div className="px-4 py-4 bg-primary/5 border-2 border-primary/20 rounded-2xl shadow-2xl min-w-50 flex flex-col items-center gap-2 group border-dashed">
    <Handle type="target" position={Position.Left} className="bg-primary/40!" />
    <Handle
      type="source"
      position={Position.Right}
      className="bg-primary/40!"
    />
    <div className="p-3 bg-primary/10 rounded-full text-primary animate-pulse">
      <Zap className="h-6 w-6" />
    </div>
    <div className="text-center">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
        SQL Processor
      </span>
      <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium italic">
        Grammar Analysis
      </p>
    </div>
  </div>
);

export const TargetNode = ({ data }: any) => (
  <div className="px-4 py-3 bg-emerald-500/5 border-2 border-emerald-500/30 rounded-xl shadow-xl min-w-45 group transition-all hover:border-emerald-500/60">
    <Handle
      type="target"
      position={Position.Left}
      className="bg-emerald-500! w-3! h-3!"
    />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
        <Table className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Output / Target
        </span>
        <span className="text-xs font-bold truncate max-w-30 text-emerald-700 dark:text-emerald-400">
          {data.label}
        </span>
      </div>
    </div>
  </div>
);

export const nodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  target: TargetNode,
};
