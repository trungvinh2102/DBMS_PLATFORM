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

      // Collect CTEs and dependencies with enhanced logic
      const allCtes = new Map<string, string[]>(); 
      let subqueryCount = 0;

      /**
       * Recursively processes an AST node to find direct dependencies and register sub-entities (CTEs/Subqueries)
       */
      const processASTNode = (stmt: any): string[] => {
        const directDeps: string[] = [];
        if (!stmt) return directDeps;

        if (Array.isArray(stmt)) {
          stmt.forEach((s) => {
            const nested = processASTNode(s);
            nested.forEach((d) => { if (!directDeps.includes(d)) directDeps.push(d); });
          });
          return directDeps;
        }

        // 1. Process CTEs in WITH clause
        if (stmt.with && Array.isArray(stmt.with)) {
          stmt.with.forEach((w: any) => {
            const cteName = w.name?.value;
            if (cteName) {
              const deps = processASTNode(w.stmt?.ast);
              allCtes.set(cteName, deps);
            }
          });
        }

        // 2. Discover tables and subqueries in FROM, JOIN, etc.
        const walk = (obj: any) => {
          if (!obj || typeof obj !== "object") return;
          if (Array.isArray(obj)) {
            obj.forEach(walk);
            return;
          }

          // Case A: Table reference
          if (obj.table && typeof obj.table === "string" && !obj.expr) {
            const dbName = obj.db && obj.db !== "null" ? obj.db.replace(/[`"\[\]]/g, "") : null;
            const tableName = obj.table.replace(/[`"\[\]]/g, "");
            const fullName = dbName ? `${dbName}.${tableName}` : tableName;
            if (!directDeps.includes(fullName)) directDeps.push(fullName);
          } 
          // Case B: Subquery
          else if (obj.expr && obj.expr.ast) {
            subqueryCount++;
            const subName = obj.as || `Subquery_${subqueryCount}`;
            const deps = processASTNode(obj.expr.ast);
            allCtes.set(subName, deps);
            if (!directDeps.includes(subName)) directDeps.push(subName);
          }

          // Crawl related structures
          if (obj.from) walk(obj.from);
          if (obj.join) walk(obj.join);
          if (obj.on) walk(obj.on); // Subqueries in join conditions
          if (obj.where) walk(obj.where); // Subqueries in WHERE
          if (obj.union) walk(obj.union);
          if (obj._next) walk(obj._next);
        };

        walk(stmt.from);
        if (stmt.union) {
          const unionDeps = processASTNode(stmt.union);
          unionDeps.forEach((d) => { if (!directDeps.includes(d)) directDeps.push(d); });
        }
        if (stmt._next) {
          const nextDeps = processASTNode(stmt._next);
          nextDeps.forEach((d) => { if (!directDeps.includes(d)) directDeps.push(d); });
        }

        return directDeps;
      };

      const topLevelDeps = processASTNode(ast);

      const targets: string[] = [];
      const sources: string[] = [];
      const foundCtes: string[] = Array.from(allCtes.keys());

      // Filter real tables from tableList
      tableList.forEach((t: string) => {
        const [type, db, table] = t.split("::");
        const dbName = db && db !== "null" ? db.replace(/[`"\[\]]/g, "") : null;
        const tableName = table.replace(/[`"\[\]]/g, "");
        const fullName = dbName ? `${dbName}.${tableName}` : tableName;

        if (allCtes.has(fullName)) { /* CTEs are handled separately */ } 
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

      // 1. Create Source Nodes
      sources.forEach((s, i) => {
        nodes.push({ 
          id: `src-${s}`, 
          type: "source", 
          data: { label: s }, 
          position: { x: 50, y: 100 + i * 120 } 
        });
      });

      // 2. Create CTE/Subquery Nodes and their internal edges
      foundCtes.forEach((c, i) => {
        nodes.push({ 
          id: `cte-${c}`, 
          type: "cte", 
          data: { label: c }, 
          position: { x: 350, y: 100 + i * 120 } 
        });
        
        const deps = allCtes.get(c) || [];
        deps.forEach((d) => {
          const sourceId = sources.includes(d) ? `src-${d}` : allCtes.has(d) ? `cte-${d}` : null;
          if (sourceId) {
            edges.push({ 
              id: `e-${sourceId}-${c}`, 
              source: sourceId, 
              target: `cte-${c}`, 
              animated: true, 
              style: { stroke: "#f59e0b", strokeWidth: 2 } 
            });
          }
        });
      });

      // 3. Create Processor Node
      const processorY = Math.max(150, (foundCtes.length * 120) / 2 || (sources.length * 120) / 2);
      nodes.push({ 
        id: "processor-0", 
        type: "transform", 
        data: { label: "SQL Processor" }, 
        position: { x: 650, y: processorY } 
      });

      // 4. Connect terminal sources and CTEs to Processor
      // Terminal means used in top-level SELECT or NOT consumed by any other CTE
      const consumedBySomething = new Set<string>();
      allCtes.forEach((deps) => deps.forEach((d) => consumedBySomething.add(d)));

      sources.forEach((s) => {
        const sourceId = `src-${s}`;
        const isDepOfMain = topLevelDeps.includes(s);
        const isUnconsumed = !consumedBySomething.has(s);
        
        if (isDepOfMain || isUnconsumed) {
          edges.push({ 
            id: `e-${sourceId}-proc`, 
            source: sourceId, 
            target: "processor-0", 
            animated: true, 
            style: { stroke: "#3b82f6", strokeWidth: 2 } 
          });
        }
      });

      foundCtes.forEach((c) => {
        const cteId = `cte-${c}`;
        const isDepOfMain = topLevelDeps.includes(c);
        const isUnconsumed = !consumedBySomething.has(c);

        if (isDepOfMain || isUnconsumed) {
          edges.push({ 
            id: `e-${cteId}-proc`, 
            source: cteId, 
            target: "processor-0", 
            animated: true, 
            style: { stroke: "#f59e0b", strokeWidth: 2 } 
          });
        }
      });

      // 5. Connect Processor to Targets
      targets.forEach((t, i) => {
        nodes.push({ 
          id: `target-${i}`, 
          type: "target", 
          data: { label: t }, 
          position: { x: 950, y: 100 + i * 120 } 
        });
        edges.push({ 
          id: `e-proc-target-${i}`, 
          source: "processor-0", 
          target: `target-${i}`, 
          animated: true, 
          style: { stroke: "#10b981", strokeWidth: 2 } 
        });
      });

      return { nodes, edges, error: null, metadata: { sources, targets } };
    } catch (e: any) {
      console.error("Lineage parsing error:", e);
      return { nodes: [], edges: [], error: e.message, metadata: { sources: [], targets: [] } };
    }
  }, [sql]);
}
