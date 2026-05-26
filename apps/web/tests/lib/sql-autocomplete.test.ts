import { describe, expect, it } from "vitest";

import {
  getSqlColumnCompletionParts,
} from "@/lib/monaco/sql-autocomplete";
import {
  sanitizeInlineSqlCompletion,
  shouldRequestInlineSqlCompletion,
  trimInlineCompletionContext,
} from "@/lib/monaco/sql-inline-ai-completion";
import {
  getSqlDialectCompletions,
  normalizeSqlDialect,
} from "@/lib/monaco/sql-dialect-completions";

describe("SQL dialect completions", () => {
  it("normalizes common dialect aliases", () => {
    expect(normalizeSqlDialect("postgres")).toBe("postgresql");
    expect(normalizeSqlDialect("mssql")).toBe("sqlserver");
    expect(normalizeSqlDialect("SQL Server")).toBe("sqlserver");
  });

  it("returns dialect-specific keywords and snippets", () => {
    const duckdb = getSqlDialectCompletions("duckdb");
    const oracle = getSqlDialectCompletions("oracle");

    expect(duckdb.keywords).toContain("read_parquet");
    expect(duckdb.snippets.map((snippet) => snippet.label)).toContain(
      "read_csv_auto",
    );
    expect(oracle.keywords).toContain("CONNECT BY");
    expect(oracle.snippets.map((snippet) => snippet.label)).toContain(
      "PL/SQL BLOCK",
    );
  });
});

describe("inline SQL completion helpers", () => {
  it("requests AI completion after SQL clause triggers", () => {
    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "SELECT",
        currentLinePrefix: "SELECT",
        nextCharacter: "",
        isExplicit: false,
      }),
    ).toBe(true);
  });

  it("skips AI completion in comments, strings, and middle of identifiers", () => {
    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "-- SELECT",
        currentLinePrefix: "-- SELECT",
        nextCharacter: "",
        isExplicit: false,
      }),
    ).toBe(false);

    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "SELECT 'abc",
        currentLinePrefix: "SELECT 'abc",
        nextCharacter: "",
        isExplicit: true,
      }),
    ).toBe(false);

    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "SELECT use",
        currentLinePrefix: "SELECT use",
        nextCharacter: "r",
        isExplicit: true,
      }),
    ).toBe(false);
  });

  it("limits context sent to the AI endpoint", () => {
    const context = trimInlineCompletionContext(
      "x".repeat(5_000),
      "y".repeat(2_000),
    );

    expect(context.prefix).toHaveLength(4_000);
    expect(context.suffix).toHaveLength(1_200);
  });

  it("cleans markdown fences and repeated current-line prefixes", () => {
    expect(
      sanitizeInlineSqlCompletion("SELECT", "```sql\nSELECT * FROM users\n```"),
    ).toBe("* FROM users");
  });
});

describe("SQL column completion metadata", () => {
  it("does not render undefined table prefixes when column metadata has no table", () => {
    expect(
      getSqlColumnCompletionParts({ name: "customer_id", type: "INTEGER" }),
    ).toEqual({
      tableName: "",
      columnName: "customer_id",
      columnType: "INTEGER",
      label: "customer_id",
      filterText: "customer_id",
    });
  });

  it("supports alternate backend column metadata field names", () => {
    expect(
      getSqlColumnCompletionParts({
        table_name: "orders",
        column_name: "created_at",
        data_type: "TIMESTAMP",
      }),
    ).toMatchObject({
      tableName: "orders",
      columnName: "created_at",
      columnType: "TIMESTAMP",
      label: "orders.created_at",
    });
  });
});
