/**
 * @file useLineage.ts
 * @description Hook for parsing SQL and generating ReactFlow nodes and edges for lineage visualization.
 */

import { useMemo } from "react";
import { Parser } from "node-sql-parser";
import { type Node, type Edge } from "@xyflow/react";

export interface LineageData {
  nodes: Node[];
  edges: Edge[];
  error: string | null;
  metadata: {
    sources: string[];
    targets: string[];
  };
}

export function useLineage(sql: string): LineageData {
  return useMemo(() => {
    if (!sql.trim()) {
      return {
        nodes: [],
        edges: [],
        error: null,
        metadata: { sources: [], targets: [] },
      };
    }

    const parser = new Parser();
    try {
      const tableList = parser.tableList(sql);

      const targets: string[] = [];
      const sources: string[] = [];

      tableList.forEach((t: string) => {
        const [type, db, table] = t.split("::");
        const fullName = db && db !== "null" ? `${db}.${table}` : table;

        if (["insert", "update", "delete", "create", "into"].includes(type)) {
          if (!targets.includes(fullName)) targets.push(fullName);
        } else {
          if (!sources.includes(fullName)) sources.push(fullName);
        }
      });

      if (targets.length === 0 && sources.length > 0) {
        targets.push("Result Set");
      }

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // 1. Source Nodes
      sources.forEach((s, i) => {
        nodes.push({
          id: `source-${i}`,
          type: "source",
          data: { label: s },
          position: { x: 50, y: 100 + i * 120 },
        });
        edges.push({
          id: `e-source-${i}`,
          source: `source-${i}`,
          target: "transform-0",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
      });

      // 2. Transform Node
      nodes.push({
        id: "transform-0",
        type: "transform",
        data: { label: "Transform" },
        position: { x: 350, y: 150 },
      });

      // 3. Target Nodes
      targets.forEach((t, i) => {
        nodes.push({
          id: `target-${i}`,
          type: "target",
          data: { label: t },
          position: { x: 650, y: 100 + i * 120 },
        });
        edges.push({
          id: `e-target-${i}`,
          source: "transform-0",
          target: `target-${i}`,
          animated: true,
          style: { stroke: "#10b981", strokeWidth: 2 },
        });
      });

      return {
        nodes,
        edges,
        error: null,
        metadata: { sources, targets },
      };
    } catch (e: any) {
      return {
        nodes: [],
        edges: [],
        error: e.message,
        metadata: { sources: [], targets: [] },
      };
    }
  }, [sql]);
}
