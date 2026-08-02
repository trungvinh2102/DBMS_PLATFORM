/**
 * @file metadata-sync.test.tsx
 * @description Regression tests for SQLEditor metadata sync.
 *
 * The metadata revision must only advance when the `tables`/`columns` metadata
 * actually changes. Unrelated re-renders (SQL text or cursor position updates)
 * must not move the revision, otherwise the SQL autocomplete cache is
 * invalidated on every keystroke.
 */

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useSqlMetadataSync } from "@/lib/monaco/MonacoEditor";

// SQLEditor pulls in @monaco-editor/react transitively; keep the real Monaco
// loader out of jsdom for this focused harness.
vi.mock("@monaco-editor/react", () => ({
  default: () => null,
  loader: {},
}));

// useEditorValidation -> validationService pulls in dt-sql-parser (antlr4ng is
// not resolvable in the test environment); stub the parser entry points.
vi.mock("@/lib/monaco/validationService", () => ({
  validateCode: vi.fn(() => ({
    isValid: true,
    markers: [],
    validationTime: 0,
  })),
  markersToErrorEntries: (markers: unknown[]) => markers,
}));

const tables = ["users", "orders"];
const columns = [
  { table: "users", name: "id", type: "INTEGER" },
  { table: "orders", name: "user_id", type: "INTEGER" },
];

describe("useSqlMetadataSync", () => {
  it("keeps the metadata revision stable across unrelated re-renders", () => {
    const { result, rerender } = renderHook(
      ({
        nextTables,
        nextColumns,
      }: {
        nextTables: string[];
        nextColumns: typeof columns;
      }) => useSqlMetadataSync(nextTables, nextColumns),
      { initialProps: { nextTables: tables, nextColumns: columns } },
    );

    const revisionAfterMount = result.current.metadataRevisionRef.current;

    // SQL text or cursor updates re-render SQLEditor while the parent keeps
    // passing the same metadata references; the revision must not move.
    rerender({ nextTables: tables, nextColumns: columns });
    rerender({ nextTables: tables, nextColumns: columns });
    rerender({ nextTables: tables, nextColumns: columns });

    expect(result.current.metadataRevisionRef.current).toBe(revisionAfterMount);
    expect(result.current.tablesRef.current).toBe(tables);
    expect(result.current.columnsRef.current).toBe(columns);
  });

  it("keeps the revision stable when a parent rebuilds equal metadata arrays", () => {
    const { result, rerender } = renderHook(
      ({
        nextTables,
        nextColumns,
      }: {
        nextTables: string[];
        nextColumns: typeof columns;
      }) => useSqlMetadataSync(nextTables, nextColumns),
      { initialProps: { nextTables: tables, nextColumns: columns } },
    );

    const revisionAfterMount = result.current.metadataRevisionRef.current;

    // A parent may allocate fresh arrays with identical content (e.g. a `|| []`
    // fallback while metadata loads). That must not invalidate the cache.
    rerender({ nextTables: [...tables], nextColumns: [...columns] });
    rerender({ nextTables: [...tables], nextColumns: [...columns] });

    expect(result.current.metadataRevisionRef.current).toBe(revisionAfterMount);
  });

  it("bumps the revision when columns metadata is replaced", () => {
    const { result, rerender } = renderHook(
      ({
        nextTables,
        nextColumns,
      }: {
        nextTables: string[];
        nextColumns: typeof columns;
      }) => useSqlMetadataSync(nextTables, nextColumns),
      { initialProps: { nextTables: tables, nextColumns: columns } },
    );

    const revisionAfterMount = result.current.metadataRevisionRef.current;

    const replacedColumns = [{ table: "users", name: "email", type: "TEXT" }];
    rerender({ nextTables: tables, nextColumns: replacedColumns });

    expect(result.current.metadataRevisionRef.current).toBe(
      revisionAfterMount + 1,
    );
    expect(result.current.columnsRef.current).toBe(replacedColumns);
    expect(result.current.tablesRef.current).toBe(tables);
  });

  it("bumps the revision when tables metadata is replaced", () => {
    const { result, rerender } = renderHook(
      ({
        nextTables,
        nextColumns,
      }: {
        nextTables: string[];
        nextColumns: typeof columns;
      }) => useSqlMetadataSync(nextTables, nextColumns),
      { initialProps: { nextTables: tables, nextColumns: columns } },
    );

    const revisionAfterMount = result.current.metadataRevisionRef.current;

    rerender({ nextTables: ["users"], nextColumns: columns });

    expect(result.current.metadataRevisionRef.current).toBe(
      revisionAfterMount + 1,
    );
    expect(result.current.tablesRef.current).toEqual(["users"]);
    expect(result.current.columnsRef.current).toBe(columns);
  });
});
