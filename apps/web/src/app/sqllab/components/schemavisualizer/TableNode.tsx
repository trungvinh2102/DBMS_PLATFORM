/**
 * @file TableNode.tsx
 * @description Custom React Flow node component representing a database table or view in the visualizer.
 */

import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Table, Hash } from "lucide-react";

export const TableNode = ({ data }: any) => {
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
      
      <div className="p-2 space-y-0.5 bg-background/50 backdrop-blur-sm max-h-75 overflow-y-auto scrollbar-none">
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
