/**
 * @file explain-plan-utils.ts
 * @description Helpers for normalizing and laying out execution plan graph data.
 */

import { MarkerType, type Edge, type Node } from "@xyflow/react";

import type { PlanGraph, PlanGraphNode } from "./explain-plan-types";

export function normalizeGraph(planData: any, dialect: string, graph?: PlanGraph): PlanGraph {
  if (graph?.nodes?.length) return graph;
  const parsedPlan = parseJsonPlan(planData);
  if (dialect === "postgresql") {
    const root = Array.isArray(parsedPlan) ? parsedPlan[0]?.Plan : parsedPlan?.Plan;
    if (root) return postgresGraph(root);
  }
  if (dialect === "sqlite" && Array.isArray(planData)) {
    return {
      nodes: planData.map((node: any) => ({
        id: `sqlite-${node.id}`,
        label: node.detail,
        operation: /search/i.test(node.detail) ? "Search" : /scan/i.test(node.detail) ? "Scan" : "Plan Step",
        relation: node.detail,
        details: node,
        warnings: /scan/i.test(node.detail) && !/index|search/i.test(node.detail) ? ["Full scan"] : [],
      })),
      edges: planData
        .filter((node: any) => node.parent && node.parent !== 0)
        .map((node: any) => ({ id: `sqlite-${node.parent}-${node.id}`, source: `sqlite-${node.parent}`, target: `sqlite-${node.id}` })),
    };
  }
  return { nodes: [], edges: [] };
}

function parseJsonPlan(planData: any) {
  if (typeof planData !== "string") return planData;
  try {
    return JSON.parse(planData);
  } catch {
    return planData;
  }
}

function postgresGraph(root: any): PlanGraph {
  const nodes: PlanGraphNode[] = [];
  const edges: PlanGraph["edges"] = [];

  const visit = (node: any, parentId?: string, index = 0) => {
    const nodeId = `pg-client-${nodes.length + 1}`;
    const operation = String(node?.["Node Type"] || "Plan Node");
    const relation = node?.["Relation Name"] || null;
    const details = {
      startupCost: node?.["Startup Cost"],
      totalCost: node?.["Total Cost"],
      planRows: node?.["Plan Rows"],
      actualRows: node?.["Actual Rows"],
      actualTotalTime: node?.["Actual Total Time"],
      filter: node?.Filter,
      indexCond: node?.["Index Cond"],
      joinType: node?.["Join Type"],
    };
    nodes.push({
      id: nodeId,
      label: relation || operation,
      operation,
      relation,
      details,
      warnings: nodeWarnings(operation, details),
    });
    if (parentId) {
      edges.push({ id: `${parentId}-${nodeId}`, source: parentId, target: nodeId, label: `child ${index + 1}` });
    }
    (node?.Plans || []).forEach((child: any, childIndex: number) => visit(child, nodeId, childIndex));
  };

  visit(root);
  return { nodes, edges };
}

function nodeWarnings(operation: string, details: Record<string, any>) {
  const warnings: string[] = [];
  if (/seq scan|scan/i.test(operation) && !/index/i.test(operation)) warnings.push("Full scan");
  if (/nested loop/i.test(operation)) warnings.push("Nested loop join");
  if (Number(details.actualTotalTime || 0) > 50) warnings.push("Slow node");
  if (Number(details.totalCost || 0) > 1000) warnings.push("High cost");
  return warnings;
}

export function layoutGraph(graph: PlanGraph): { nodes: Node<PlanGraphNode>[]; edges: Edge[] } {
  const childrenByParent = new Map<string, string[]>();
  const incoming = new Set(graph.edges.map((edge) => edge.target));
  graph.edges.forEach((edge) => {
    childrenByParent.set(edge.source, [...(childrenByParent.get(edge.source) || []), edge.target]);
  });

  const roots = graph.nodes.filter((node) => !incoming.has(node.id));
  const levels = new Map<string, number>();
  const order = new Map<string, number>();
  const queue = roots.length ? roots.map((node) => node.id) : graph.nodes.slice(0, 1).map((node) => node.id);
  let cursor = 0;

  while (queue.length) {
    const id = queue.shift()!;
    if (order.has(id)) continue;
    order.set(id, cursor++);
    const parentLevel = levels.get(id) || 0;
    for (const child of childrenByParent.get(id) || []) {
      levels.set(child, parentLevel + 1);
      queue.push(child);
    }
  }

  return {
    nodes: graph.nodes.map((node, index) => ({
      id: node.id,
      type: "planNode",
      data: node,
      position: {
        x: ((order.get(node.id) ?? index) % 4) * 290,
        y: (levels.get(node.id) ?? Math.floor(index / 4)) * 190,
      },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || undefined,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.8 },
    })),
  };
}
