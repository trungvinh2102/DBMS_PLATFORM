/**
 * @file useLineage.ts
 * @description Hook for parsing SQL and generating ReactFlow nodes and edges for lineage visualization.
 */

import { useMemo } from "react";
import { Parser } from "node-sql-parser";
import { type Node, type Edge } from "@xyflow/react";
import { preprocessSQL, getSupportedDialect } from "../utils/lineage-utils";

export interface LineageData {
  nodes: Node[];
  edges: Edge[];
  error: string | null;
  metadata: {
    sources: string[];
    targets: string[];
  };
}

const EMPTY_ARRAY: any[] = [];
const DEFAULT_METADATA = { sources: EMPTY_ARRAY, targets: EMPTY_ARRAY };

/**
 * Parses SQL to determine data lineage (sources -> ctes -> processor -> targets).
 */
export function useLineage(
  sql: string,
  dialect: string = "mysql",
): LineageData {
  return useMemo(() => {
    if (!sql.trim()) {
      return {
        nodes: EMPTY_ARRAY,
        edges: EMPTY_ARRAY,
        error: null,
        metadata: DEFAULT_METADATA,
      };
    }

    let cleanSql = preprocessSQL(sql);
    let effectiveDialect = getSupportedDialect(dialect);
    
    // Force postgresql for oralce-like queries after cleaning
    if (sql.match(/\b(CONNECT\s+BY|START\s+WITH|PRIOR)\b/i)) {
      effectiveDialect = "postgresql"; 
    }

    const parser = new Parser();

    try {
      let ast: any;
      let tableList: any[] = [];

      // Primary parse attempt
      try {
        ast = parser.astify(cleanSql, { database: effectiveDialect });
      } catch (ae: any) {
        // Fallback strategy: try more relaxed dialects or splitting
        try {
          ast = parser.astify(cleanSql, { database: "bigquery" });
          effectiveDialect = "bigquery";
        } catch (e2) {
          try {
            ast = parser.astify(cleanSql, { database: "mysql" });
            effectiveDialect = "mysql";
          } catch (e3) {
            if (cleanSql.includes(";")) {
              const stmts = cleanSql.split(";").filter((s) => s.trim().length > 0);
              try {
                ast = stmts.map((s) => {
                    try { return parser.astify(s.trim(), { database: "mysql" }); } catch (e) { return null; }
                  }).filter(Boolean);
                effectiveDialect = "mysql";
              } catch (e4) { throw new Error(`Parse error: ${ae.message}`); }
            } else { throw new Error(`Parse error: ${ae.message}`); }
          }
        }
      }

      // tableList using the best dialect found
      try {
        tableList = parser.tableList(cleanSql, { database: effectiveDialect });
      } catch (te) {
        if (cleanSql.includes(";")) {
          const statements = cleanSql.split(";").filter((s) => s.trim().length > 0);
          statements.forEach((s) => {
            try {
              const list = parser.tableList(s.trim(), { database: effectiveDialect });
              tableList = [...tableList, ...list];
            } catch (e) {}
          });
        }
      }

      // Collect CTEs and dependencies
      const allCtes = new Map<string, string[]>(); 
      let subqueryCount = 0;

      const extractDeps = (s: any, deps: string[]) => {
        if (!s) return;
        if (s._next) extractDeps(s._next, deps);
        if (s.from) {
          s.from.forEach((f: any) => {
            if (f.table) {
              const dbName = f.db ? f.db.replace(/[`"\[\]]/g, "") : null;
              const tableName = f.table.replace(/[`"\[\]]/g, "");
              const fullName = dbName ? `${dbName}.${tableName}` : tableName;
              if (!deps.includes(fullName)) deps.push(fullName);
            }
            if (f.expr?.ast) extractDeps(f.expr.ast, deps);
          });
        }
      };

      const collectInfo = (stmt: any) => {
        if (!stmt) return;
        if (stmt.with) {
          stmt.with.forEach((w: any) => {
            const cteName = w.name?.value;
            if (cteName) {
              const deps: string[] = [];
              extractDeps(w.stmt?.ast, deps);
              allCtes.set(cteName, deps);
              collectInfo(w.stmt?.ast);
            }
          });
        }
        if (stmt.from) {
          stmt.from.forEach((f: any) => {
            if (f.expr?.ast) {
              subqueryCount++;
              const subqueryName = f.as || `Subquery_${subqueryCount}`;
              const deps: string[] = [];
              extractDeps(f.expr.ast, deps);
              allCtes.set(subqueryName, deps);
              collectInfo(f.expr.ast);
            }
          });
        }
        if (stmt._next) collectInfo(stmt._next);
      };

      if (Array.isArray(ast)) ast.forEach(collectInfo);
      else collectInfo(ast);

      const targets: string[] = [];
      const sources: string[] = [];
      const foundCtes: string[] = Array.from(allCtes.keys());

      tableList.forEach((t: string) => {
        const [type, db, table] = t.split("::");
        const dbName = db && db !== "null" ? db.replace(/[`"\[\]]/g, "") : null;
        const tableName = table.replace(/[`"\[\]]/g, "");
        const fullName = dbName ? `${dbName}.${tableName}` : tableName;

        if (allCtes.has(fullName)) { /* Skip CTE */ } 
        else if (["insert", "update", "delete", "create", "into"].includes(type)) {
          if (!targets.includes(fullName)) targets.push(fullName);
        } else {
          if (!sources.includes(fullName)) sources.push(fullName);
        }
      });

      if (targets.length === 0 && (sources.length > 0 || foundCtes.length > 0)) {
        targets.push("Result Set");
      }

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // Build flow
      sources.forEach((s, i) => {
        nodes.push({ id: `src-${s}`, type: "source", data: { label: s }, position: { x: 50, y: 100 + i * 120 } });
      });

      foundCtes.forEach((c, i) => {
        nodes.push({ id: `cte-${c}`, type: "cte", data: { label: c }, position: { x: 350, y: 100 + i * 120 } });
        const deps = allCtes.get(c) || [];
        deps.forEach((d) => {
          const sourceId = sources.includes(d) ? `src-${d}` : allCtes.has(d) ? `cte-${d}` : null;
          if (sourceId) {
            edges.push({ id: `e-${sourceId}-${c}`, source: sourceId, target: `cte-${c}`, animated: true, style: { stroke: "#f59e0b", strokeWidth: 2 } });
          }
        });
      });

      const processorY = Math.max(150, (foundCtes.length * 120) / 2);
      nodes.push({ id: "processor-0", type: "transform", data: { label: "SQL Processor" }, position: { x: 650, y: processorY } });

      foundCtes.forEach((c) => {
        edges.push({ id: `e-cte-${c}-proc`, source: `cte-${c}`, target: "processor-0", animated: true, style: { stroke: "#f59e0b", strokeWidth: 2 } });
      });

      sources.forEach((s) => {
        const isUsedInAnyCte = Array.from(allCtes.values()).some((d) => d.includes(s));
        if (!isUsedInAnyCte) {
          edges.push({ id: `e-src-${s}-proc`, source: `src-${s}`, target: "processor-0", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } });
        }
      });

      targets.forEach((t, i) => {
        nodes.push({ id: `target-${i}`, type: "target", data: { label: t }, position: { x: 950, y: 100 + i * 120 } });
        edges.push({ id: `e-proc-target-${i}`, source: "processor-0", target: `target-${i}`, animated: true, style: { stroke: "#10b981", strokeWidth: 2 } });
      });

      return { nodes, edges, error: null, metadata: { sources, targets } };
    } catch (e: any) {
      console.error("Lineage parsing error:", e);
      return { nodes: [], edges: [], error: e.message, metadata: { sources: [], targets: [] } };
    }
  }, [sql]);
}
