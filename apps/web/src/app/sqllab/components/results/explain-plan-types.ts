/**
 * @file explain-plan-types.ts
 * @description Shared TypeScript contracts for SQL Lab execution plan visualization.
 */

export interface PlanGraph {
  nodes: PlanGraphNode[];
  edges: PlanGraphEdge[];
}

export interface PlanGraphNode extends Record<string, unknown> {
  id: string;
  label: string;
  operation: string;
  relation?: string | null;
  details?: Record<string, any>;
  warnings?: string[];
}

export interface PlanGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
}

export type ViewerTab = "graph" | "ai" | "raw";
