/**
 * @file lineage-utils.ts
 * @description Utility functions for SQL lineage analysis, including preprocessing and dialect mapping.
 */

export const preprocessSQL = (s: string): string => {
  let processed = s;

  // 1. Remove ALL types of comments first
  processed = processed.replace(/--.*$/gm, " ");
  processed = processed.replace(/\/\*[\s\S]*?\*\//g, " ");
  processed = processed.replace(/\{#[\s\S]*?#\}/g, " ");

  // 2. Handle Oracle-specific hierarchical clauses that break many parsers
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

/**
 * Maps database types to dialects supported by node-sql-parser.
 */
export const getSupportedDialect = (d: string): string => {
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
  // SQLite uses sqlite dialect in node-sql-parser
  if (dd.includes("sqlite")) return "sqlite";
  // DuckDB SQL is PostgreSQL-compatible
  if (dd.includes("duckdb")) return "postgresql";
  return "mysql"; // Default fallback
};
