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

const EMPTY_ARRAY: any[] = [];
const DEFAULT_METADATA = { sources: EMPTY_ARRAY, targets: EMPTY_ARRAY };

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

    const preprocessSQL = (s: string) => {
      let processed = s;

      // 1. Remove ALL types of comments first
      processed = processed.replace(/--.*$/gm, " ");
      processed = processed.replace(/\/\*[\s\S]*?\*\//g, " ");
      processed = processed.replace(/\{#[\s\S]*?#\}/g, " ");

      // 2. Handle Oracle-specific hierarchical clauses that break many parsers
      // We consume these clauses until the next major SQL clause or semicolon
      const sqlBreakers =
        "\\b(SELECT|WITH|INSERT|UPDATE|DELETE|GROUP|ORDER|HAVING|UNION|WHERE|LIMIT|OFFSET|FETCH|FOR)\\b";
      const oracleRegex = new RegExp(
        `\\b(START\\s+WITH|CONNECT\\s+BY(?:\\s+PRIOR)?)\\b[\\s\\S]*?(?=${sqlBreakers}|;|\\)|$)`,
        "gi",
      );
      processed = processed.replace(oracleRegex, " ");
      processed = processed.replace(/\bPRIOR\b/gi, " ");

      // 3. Remove Jinja statements: {% ... %}
      processed = processed.replace(/\{%[\s\S]*?%\}/g, " ");

      // 4. Handle Jinja expressions: {{ ... }}
      processed = processed.replace(/\{\{[\s\S]*?\}\}/g, (match) => {
        const m = match.match(
          /(?:ref|source)\s*\(\s*['"]?([^'"]+)['"]?\s*(?:,\s*['"]?([^'"]+)['"]?)?\s*\)/i,
        );
        if (m) {
          return m[2] ? `${m[1]}.${m[2]}` : m[1];
        }
        return " __JINJA_VAR__ ";
      });

      // 5. Normalization of whitespace
      processed = processed.replace(
        /[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g,
        " ",
      );

      return processed.trim();
    };

    let cleanSql = preprocessSQL(sql);

    // 6. Map to supported dialects by node-sql-parser
    // Supported: bigquery, db2, hive, mariadb, mysql, postgresql, transactsql, flinksql, snowflake
    const getSupportedDialect = (d: string): string => {
      const dd = d.toLowerCase();
      if (dd.includes("postgres")) return "postgresql";
      if (dd.includes("mysql") || dd.includes("mariadb")) return "mysql";
      if (
        dd.includes("sqlserver") ||
        dd.includes("mssql") ||
        dd.includes("transactsql")
      )
        return "transactsql";
      if (dd.includes("bigquery")) return "bigquery";
      if (dd.includes("snowflake")) return "snowflake";
      // Oracle is NOT supported natively, use postgresql as closest approximation after cleaning
      if (dd.includes("oracle")) return "postgresql";
      return "mysql"; // Default fallback
    };

    let effectiveDialect = getSupportedDialect(dialect);
    if (sql.match(/\b(CONNECT\s+BY|START\s+WITH|PRIOR)\b/i)) {
      effectiveDialect = "postgresql"; // Force postgresql for oralce-like queries after cleaning
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
              const stmts = cleanSql
                .split(";")
                .filter((s) => s.trim().length > 0);
              try {
                // If its multi-stmt, map them. Use mysql as its the most lenient.
                ast = stmts
                  .map((s) => {
                    try {
                      return parser.astify(s.trim(), { database: "mysql" });
                    } catch (e) {
                      return null;
                    }
                  })
                  .filter(Boolean);
                effectiveDialect = "mysql";
              } catch (e4) {
                throw new Error(`Parse error: ${ae.message}`);
              }
            } else {
              throw new Error(`Parse error: ${ae.message}`);
            }
          }
        }
      }

      // tableList using the best dialect found
      try {
        tableList = parser.tableList(cleanSql, { database: effectiveDialect });
      } catch (te) {
        if (cleanSql.includes(";")) {
          const statements = cleanSql
            .split(";")
            .filter((s) => s.trim().length > 0);
          statements.forEach((s) => {
            try {
              const list = parser.tableList(s.trim(), {
                database: effectiveDialect,
              });
              tableList = [...tableList, ...list];
            } catch (e) {}
          });
        }
      }

      // 2. Extract CTEs and their source dependencies
      const allCtes = new Map<string, string[]>(); // Name -> Source Dependencies
      let subqueryCount = 0;

      const extractDeps = (s: any, deps: string[]) => {
        if (!s) return;

        // Handle UNION / set operations
        if (s._next) {
          extractDeps(s._next, deps);
        }

        if (s.from) {
          s.from.forEach((f: any) => {
            if (f.table) {
              const dbName = f.db ? f.db.replace(/[`"\[\]]/g, "") : null;
              const tableName = f.table.replace(/[`"\[\]]/g, "");
              const fullName = dbName ? `${dbName}.${tableName}` : tableName;
              if (!deps.includes(fullName)) {
                deps.push(fullName);
              }
            }
            if (f.expr?.ast) {
              extractDeps(f.expr.ast, deps);
            }
          });
        }
      };

      const collectInfo = (stmt: any) => {
        if (!stmt) return;

        // Handle WITH clause (CTEs)
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

        // Handle Subqueries in FROM
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

        // Recursive call for UNION/set operations at this level
        if (stmt._next) {
          collectInfo(stmt._next);
        }
      };

      if (Array.isArray(ast)) ast.forEach(collectInfo);
      else collectInfo(ast);

      // 3. Categorize Tables
      const targets: string[] = [];
      const sources: string[] = [];
      const foundCtes: string[] = Array.from(allCtes.keys());

      tableList.forEach((t: string) => {
        const [type, db, table] = t.split("::");
        const dbName = db && db !== "null" ? db.replace(/[`"\[\]]/g, "") : null;
        const tableName = table.replace(/[`"\[\]]/g, "");
        const fullName = dbName ? `${dbName}.${tableName}` : tableName;

        if (allCtes.has(fullName)) {
          // Already in CTEs list
        } else if (
          ["insert", "update", "delete", "create", "into"].includes(type)
        ) {
          if (!targets.includes(fullName)) targets.push(fullName);
        } else {
          if (!sources.includes(fullName)) sources.push(fullName);
        }
      });

      if (
        targets.length === 0 &&
        (sources.length > 0 || foundCtes.length > 0)
      ) {
        targets.push("Result Set");
      }

      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // 4. Create Nodes

      // Source Nodes (Column 1: x=50)
      sources.forEach((s, i) => {
        nodes.push({
          id: `src-${s}`,
          type: "source",
          data: { label: s },
          position: { x: 50, y: 100 + i * 120 },
        });
      });

      // CTE/Subquery Nodes (Column 2: x=350)
      foundCtes.forEach((c, i) => {
        nodes.push({
          id: `cte-${c}`,
          type: "cte",
          data: { label: c },
          position: { x: 350, y: 100 + i * 120 },
        });

        // Edges from sources to this CTE
        const deps = allCtes.get(c) || [];
        deps.forEach((d) => {
          // Try to link to source or previous CTE
          const sourceId = sources.includes(d)
            ? `src-${d}`
            : allCtes.has(d)
              ? `cte-${d}`
              : null;
          if (sourceId) {
            edges.push({
              id: `e-${sourceId}-${c}`,
              source: sourceId,
              target: `cte-${c}`,
              animated: true,
              style: { stroke: "#f59e0b", strokeWidth: 2 },
            });
          }
        });
      });

      // Transform Processor Node (Column 3: x=650)
      const processorY = Math.max(150, (foundCtes.length * 120) / 2);
      nodes.push({
        id: "processor-0",
        type: "transform",
        data: { label: "SQL Processor" },
        position: { x: 650, y: processorY },
      });

      // Connections to Processor
      foundCtes.forEach((c) => {
        edges.push({
          id: `e-cte-${c}-proc`,
          source: `cte-${c}`,
          target: "processor-0",
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 2 },
        });
      });

      sources.forEach((s) => {
        // Only connect to processor if not used in any CTE to avoid clutter
        const isUsedInAnyCte = Array.from(allCtes.values()).some((d) =>
          d.includes(s),
        );
        if (!isUsedInAnyCte) {
          edges.push({
            id: `e-src-${s}-proc`,
            source: `src-${s}`,
            target: "processor-0",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          });
        }
      });

      // Target Nodes (Column 4: x=950)
      targets.forEach((t, i) => {
        nodes.push({
          id: `target-${i}`,
          type: "target",
          data: { label: t },
          position: { x: 950, y: 100 + i * 120 },
        });
        edges.push({
          id: `e-proc-target-${i}`,
          source: "processor-0",
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
      console.error("Lineage parsing error:", e);
      return {
        nodes: [],
        edges: [],
        error: e.message,
        metadata: { sources: [], targets: [] },
      };
    }
  }, [sql]);
}
