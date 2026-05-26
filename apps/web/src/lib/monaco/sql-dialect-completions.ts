/**
 * @file sql-dialect-completions.ts
 * @description Dialect-aware SQL keyword and snippet definitions for Monaco completion providers.
 */

export interface SqlSnippetCompletion {
  label: string;
  insertText: string;
  documentation: string;
}

export interface SqlDialectCompletions {
  keywords: string[];
  snippets: SqlSnippetCompletion[];
}

const BASE_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "INSERT",
  "UPDATE",
  "DELETE",
  "LIMIT",
  "ORDER BY",
  "GROUP BY",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "ON",
  "AS",
  "DISTINCT",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "HAVING",
  "IN",
  "BETWEEN",
  "LIKE",
  "IS NULL",
  "IS NOT NULL",
  "UNION",
  "ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "AND",
  "OR",
  "NOT",
  "EXISTS",
  "CREATE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "INDEX",
  "VIEW",
  "TRIGGER",
  "PROCEDURE",
  "FUNCTION",
] as const;

const POSTGRES_KEYWORDS = [
  "RETURNING",
  "ILIKE",
  "SERIAL",
  "BIGSERIAL",
  "JSONB",
  "ARRAY",
  "UNNEST",
  "LATERAL",
  "CONFLICT",
  "DO NOTHING",
  "DO UPDATE",
] as const;

const MYSQL_KEYWORDS = [
  "AUTO_INCREMENT",
  "REPLACE",
  "DUPLICATE KEY",
  "ENGINE",
  "CHARSET",
  "COLLATE",
  "UNSIGNED",
  "LOCK TABLES",
] as const;

const SQLITE_KEYWORDS = [
  "PRAGMA",
  "WITHOUT ROWID",
  "AUTOINCREMENT",
  "VACUUM",
  "ATTACH",
  "DETACH",
  "REPLACE",
] as const;

const CLICKHOUSE_KEYWORDS = [
  "ENGINE",
  "MERGETREE",
  "SUMMINGMERGETREE",
  "REPLACINGMERGETREE",
  "AGGREGATINGMERGETREE",
  "COLLAPSINGMERGETREE",
  "VERSIONEDCOLLAPSINGMERGETREE",
  "TINYLOG",
  "LOG",
  "STRIPELOG",
  "MATERIALIZED",
  "EPHEMERAL",
  "ALIAS",
  "TTL",
  "SETTINGS",
  "FORMAT",
  "UNIQ",
  "UNIQCOMBINED",
  "UNIQEXACT",
  "QUANTILES",
  "GROUPARRAY",
  "GROUPUNIQARRAY",
  "ARRAYMAP",
  "ARRAYFILTER",
  "ARRAYJOIN",
] as const;

const DUCKDB_KEYWORDS = [
  "EXCLUDE",
  "REPLACE",
  "COLUMNS",
  "PIVOT",
  "UNPIVOT",
  "SUMMARIZE",
  "ASOF",
  "INSTALL",
  "LOAD",
  "PRAGMA",
  "ATTACH",
  "DETACH",
  "MACRO",
  "COPY",
  "read_csv_auto",
  "read_parquet",
  "parquet_schema",
  "read_json_auto",
] as const;

const ORACLE_KEYWORDS = [
  "DUAL",
  "ROWNUM",
  "SYSDATE",
  "TO_DATE",
  "TO_CHAR",
  "TO_NUMBER",
  "DECODE",
  "NVL",
  "NVL2",
  "COALESCE",
  "MERGE",
  "MATCHED",
  "CONNECT BY",
  "START WITH",
  "PRIOR",
  "VARCHAR2",
  "NUMBER",
  "CLOB",
  "BLOB",
  "DBMS_OUTPUT.PUT_LINE",
  "BEGIN",
  "EXCEPTION",
] as const;

const SQLSERVER_KEYWORDS = [
  "TOP",
  "OFFSET",
  "FETCH NEXT",
  "IDENTITY",
  "NVARCHAR",
  "DATETIME2",
  "TRY_CONVERT",
  "TRY_CAST",
  "CROSS APPLY",
  "OUTER APPLY",
] as const;

const DIALECT_KEYWORDS: Record<string, readonly string[]> = {
  postgresql: POSTGRES_KEYWORDS,
  postgres: POSTGRES_KEYWORDS,
  mysql: MYSQL_KEYWORDS,
  mariadb: MYSQL_KEYWORDS,
  sqlite: SQLITE_KEYWORDS,
  clickhouse: CLICKHOUSE_KEYWORDS,
  duckdb: DUCKDB_KEYWORDS,
  oracle: ORACLE_KEYWORDS,
  sqlserver: SQLSERVER_KEYWORDS,
  mssql: SQLSERVER_KEYWORDS,
};

const DIALECT_SNIPPETS: Record<string, SqlSnippetCompletion[]> = {
  duckdb: [
    {
      label: "read_csv_auto",
      insertText: "read_csv_auto('${1:path/to/file.csv}')",
      documentation: "DuckDB file reader",
    },
    {
      label: "read_parquet",
      insertText: "read_parquet('${1:path/to/file.parquet}')",
      documentation: "DuckDB file reader",
    },
    {
      label: "read_json_auto",
      insertText: "read_json_auto('${1:path/to/file.json}')",
      documentation: "DuckDB file reader",
    },
    {
      label: "parquet_schema",
      insertText: "parquet_schema('${1:path/to/file.parquet}')",
      documentation: "DuckDB metadata helper",
    },
    {
      label: "ATTACH",
      insertText: "ATTACH '${1:filename.duckdb}' AS ${2:alias};",
      documentation: "DuckDB database attachment",
    },
  ],
  oracle: [
    {
      label: "SELECT FROM DUAL",
      insertText: "SELECT ${1:*} FROM DUAL;",
      documentation: "Oracle single-row query",
    },
    {
      label: "FETCH FIRST",
      insertText: "FETCH FIRST ${1:10} ROWS ONLY",
      documentation: "Oracle row limiting",
    },
    {
      label: "TO_DATE",
      insertText: "TO_DATE('${1:2024-01-01}', '${2:YYYY-MM-DD}')",
      documentation: "Oracle date parsing",
    },
    {
      label: "CONNECT BY PRIOR",
      insertText:
        "START WITH ${1:condition}\nCONNECT BY PRIOR ${2:parent_id} = ${3:id};",
      documentation: "Oracle hierarchical query",
    },
    {
      label: "MERGE INTO",
      insertText:
        "MERGE INTO ${1:target_table} t\nUSING ${2:source_table} s\nON (t.${3:id} = s.${4:id})\nWHEN MATCHED THEN\n  UPDATE SET ${5:t.col = s.col}\nWHEN NOT MATCHED THEN\n  INSERT (${6:cols}) VALUES (${7:vals});",
      documentation: "Oracle merge statement",
    },
    {
      label: "PL/SQL BLOCK",
      insertText:
        "DECLARE\n  ${1:v_var} ${2:VARCHAR2(100)};\nBEGIN\n  ${3:-- logic}\nEXCEPTION\n  WHEN OTHERS THEN\n    DBMS_OUTPUT.PUT_LINE(SQLERRM);\nEND;",
      documentation: "Oracle PL/SQL block",
    },
  ],
};

export const normalizeSqlDialect = (dialect?: string): string => {
  const normalized = (dialect || "postgresql").trim().toLowerCase();
  if (normalized === "postgres") return "postgresql";
  if (normalized === "mssql" || normalized === "sql server") return "sqlserver";
  return normalized || "postgresql";
};

export const getSqlDialectCompletions = (
  dialect?: string,
): SqlDialectCompletions => {
  const normalized = normalizeSqlDialect(dialect);
  const keywords = [...BASE_KEYWORDS, ...(DIALECT_KEYWORDS[normalized] || [])];
  return {
    keywords: Array.from(new Set(keywords)),
    snippets: DIALECT_SNIPPETS[normalized] || [],
  };
};
