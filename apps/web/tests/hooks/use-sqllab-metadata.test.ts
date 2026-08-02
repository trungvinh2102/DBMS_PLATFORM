import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  flattenSchemaColumnsForAutocomplete,
  useSQLLabMetadata,
} from "@/app/sqllab/hooks/use-sqllab-metadata";

const { getAllColumnsMock } = vi.hoisted(() => ({ getAllColumnsMock: vi.fn() }));

vi.mock("@/lib/api-client", () => ({
  databaseApi: {
    list: vi.fn().mockResolvedValue([]),
    getSchemas: vi.fn().mockResolvedValue(["public"]),
    getTables: vi.fn().mockResolvedValue(["users"]),
    getViews: vi.fn().mockResolvedValue([]),
    getFunctions: vi.fn().mockResolvedValue([]),
    getProcedures: vi.fn().mockResolvedValue([]),
    getTriggers: vi.fn().mockResolvedValue([]),
    getEvents: vi.fn().mockResolvedValue([]),
    getMaterializedViews: vi.fn().mockResolvedValue([]),
    getSequences: vi.fn().mockResolvedValue([]),
    getPartitions: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue([]),
    getGrants: vi.fn().mockResolvedValue([]),
    getTablespaces: vi.fn().mockResolvedValue([]),
    getExtensions: vi.fn().mockResolvedValue([]),
    getSynonyms: vi.fn().mockResolvedValue([]),
    getJobs: vi.fn().mockResolvedValue([]),
    getIndexes: vi.fn().mockResolvedValue([]),
    getForeignKeys: vi.fn().mockResolvedValue([]),
    getTableInfo: vi.fn().mockResolvedValue(null),
    getDDL: vi.fn().mockResolvedValue(""),
    getColumns: vi.fn().mockResolvedValue([]),
    getAllColumns: getAllColumnsMock,
  },
}));

describe("flattenSchemaColumnsForAutocomplete", () => {
  it("flattens all-columns metadata and attaches table names", () => {
    expect(
      flattenSchemaColumnsForAutocomplete({
        users: [{ name: "id", type: "INTEGER" }],
        orders: [{ name: "user_id", type: "INTEGER" }],
      }),
    ).toEqual([
      {
        name: "id",
        type: "INTEGER",
        table: "users",
        tableName: "users",
        table_name: "users",
      },
      {
        name: "user_id",
        type: "INTEGER",
        table: "orders",
        tableName: "orders",
        table_name: "orders",
      },
    ]);
  });

  it("keeps array metadata usable for single-table fallbacks", () => {
    expect(flattenSchemaColumnsForAutocomplete([{ name: "email" }])).toEqual([
      { name: "email" },
    ]);
  });
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
  };
}

const baseProps = {
  selectedDS: "db-1",
  selectedTable: null as string | null,
};

describe("useSQLLabMetadata autocompleteColumns identity", () => {
  beforeEach(() => {
    getAllColumnsMock.mockReset();
    getAllColumnsMock.mockResolvedValue({
      users: [{ name: "id", type: "INTEGER" }],
      orders: [{ name: "user_id", type: "INTEGER" }],
    });
  });

  it("keeps array identity across SQL/cursor re-renders and identical refetches", async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result, rerender } = renderHook(
      ({ selectedTable }: { selectedTable: string | null }) =>
        useSQLLabMetadata({
          ...baseProps,
          selectedTable,
          selectedSchema: "public",
        }),
      { initialProps: { selectedTable: null }, wrapper },
    );

    await waitFor(() => {
      expect(result.current.autocompleteColumns).toEqual([
        {
          name: "id",
          type: "INTEGER",
          table: "users",
          tableName: "users",
          table_name: "users",
        },
        {
          name: "user_id",
          type: "INTEGER",
          table: "orders",
          tableName: "orders",
          table_name: "orders",
        },
      ]);
    });

    const loadedIdentity = result.current.autocompleteColumns;

    // Unrelated consumer re-renders (SQL text / cursor position updates) must
    // not replace the metadata array.
    rerender({ selectedTable: null });
    rerender({ selectedTable: null });
    expect(result.current.autocompleteColumns).toBe(loadedIdentity);

    // Refetching the same schema metadata keeps the array identity too.
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ["all-columns", "db-1", "public"],
      });
    });
    expect(result.current.autocompleteColumns).toBe(loadedIdentity);
  });

  it("replaces the array when schema metadata actually changes", async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () =>
        useSQLLabMetadata({
          ...baseProps,
          selectedSchema: "public",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.autocompleteColumns.length).toBeGreaterThan(0);
    });
    const before = result.current.autocompleteColumns;

    getAllColumnsMock.mockResolvedValue({
      users: [{ name: "email", type: "TEXT" }],
    });
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: ["all-columns", "db-1", "public"],
      });
    });

    await waitFor(() => {
      expect(result.current.autocompleteColumns).toEqual([
        {
          name: "email",
          type: "TEXT",
          table: "users",
          tableName: "users",
          table_name: "users",
        },
      ]);
    });
    expect(result.current.autocompleteColumns).not.toBe(before);
  });

  it("replaces the array when the selected schema changes", async () => {
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ selectedSchema }: { selectedSchema: string }) =>
        useSQLLabMetadata({
          ...baseProps,
          selectedSchema,
        }),
      { initialProps: { selectedSchema: "public" }, wrapper },
    );

    await waitFor(() => {
      expect(result.current.autocompleteColumns.length).toBeGreaterThan(0);
    });
    const before = result.current.autocompleteColumns;

    getAllColumnsMock.mockResolvedValue({
      analytics: [{ name: "session_id", type: "TEXT" }],
    });
    rerender({ selectedSchema: "analytics" });

    await waitFor(() => {
      expect(result.current.autocompleteColumns).toEqual([
        {
          name: "session_id",
          type: "TEXT",
          table: "analytics",
          tableName: "analytics",
          table_name: "analytics",
        },
      ]);
    });
    expect(result.current.autocompleteColumns).not.toBe(before);
  });
});
