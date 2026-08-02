import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSQLLabMetadata } from "@/app/sqllab/hooks/use-sqllab-metadata";

type Endpoint =
  | "list"
  | "schemas"
  | "tables"
  | "views"
  | "functions"
  | "procedures"
  | "triggers"
  | "events"
  | "materializedViews"
  | "sequences"
  | "partitions"
  | "roles"
  | "grants"
  | "tablespaces"
  | "extensions"
  | "synonyms"
  | "jobs"
  | "indexes"
  | "foreignKeys"
  | "tableInfo"
  | "ddl"
  | "columns"
  | "allColumns";

type RequestRecord = {
  endpoint: Endpoint;
  databaseId?: string;
  schema?: string;
  table?: string;
  resolve: (value?: unknown) => void;
};

const { calls, requestMocks, endpoints } = vi.hoisted(() => ({
  calls: [] as RequestRecord[],
  requestMocks: {} as Record<Endpoint, ReturnType<typeof vi.fn>>,
  endpoints: [
    "list",
    "schemas",
    "tables",
    "views",
    "functions",
    "procedures",
    "triggers",
    "events",
    "materializedViews",
    "sequences",
    "partitions",
    "roles",
    "grants",
    "tablespaces",
    "extensions",
    "synonyms",
    "jobs",
    "indexes",
    "foreignKeys",
    "tableInfo",
    "ddl",
    "columns",
    "allColumns",
  ] as Endpoint[],
}));

vi.mock("@/lib/api-client", () => {
  const databaseApi = Object.fromEntries(
    endpoints.map((endpoint) => {
      const mock = vi.fn((...args: string[]) =>
        new Promise((resolve) => {
          const databaseId = args[0];
          const isTableMetadata = [
            "indexes",
            "foreignKeys",
            "tableInfo",
            "ddl",
            "columns",
          ].includes(endpoint);
          calls.push({
            endpoint,
            databaseId,
            schema: isTableMetadata ? args[2] : args[1],
            table: isTableMetadata ? args[1] : undefined,
            resolve,
          });
        }),
      );
      requestMocks[endpoint] = mock;
      const methodName =
        endpoint === "list"
          ? "list"
          : endpoint === "ddl"
            ? "getDDL"
            : `get${endpoint[0].toUpperCase()}${endpoint.slice(1)}`;
      return [methodName, mock];
    }),
  );

  return { databaseApi };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

function count(endpoint: Endpoint, databaseId?: string, schema?: string) {
  return calls.filter(
    (call) =>
      call.endpoint === endpoint &&
      (databaseId === undefined || call.databaseId === databaseId) &&
      (schema === undefined || call.schema === schema),
  ).length;
}

function resolve(endpoint: Endpoint, value: unknown = []) {
  for (const call of calls.filter((call) => call.endpoint === endpoint)) {
    call.resolve(value);
  }
}

beforeEach(() => {
  calls.length = 0;
  for (const mock of Object.values(requestMocks)) mock.mockClear();
});

describe("useSQLLabMetadata request policy", () => {
  it("does not fan out schema metadata before a schema is selected", async () => {
    const { wrapper } = createWrapper();
    const { unmount } = renderHook(
      () =>
        useSQLLabMetadata({
          selectedDS: "db-1",
          selectedSchema: "",
          selectedTable: null,
        }),
      { wrapper },
    );

    expect(count("list")).toBe(1);
    expect(count("schemas", "db-1")).toBe(1);
    expect(count("roles", "db-1")).toBe(1);
    expect(count("tablespaces", "db-1")).toBe(1);
    expect(
      calls.filter((call) =>
        [
          "tables",
          "views",
          "functions",
          "procedures",
          "triggers",
          "events",
          "materializedViews",
          "sequences",
          "partitions",
          "grants",
          "extensions",
          "synonyms",
          "jobs",
          "indexes",
          "foreignKeys",
          "tableInfo",
          "ddl",
          "columns",
          "allColumns",
        ].includes(call.endpoint),
      ),
    ).toHaveLength(0);
    expect(calls).toHaveLength(4);
    unmount();
  });

  it("does not request metadata for SQL, cursor, or tab-only rerenders", async () => {
    const { wrapper } = createWrapper();
    const { rerender, unmount } = renderHook(
      () =>
        useSQLLabMetadata({
          selectedDS: "db-1",
          selectedSchema: "public",
          selectedTable: null,
        }),
      { wrapper },
    );

    for (const endpoint of endpoints) resolve(endpoint);
    await waitFor(() => expect(count("tables", "db-1", "public")).toBe(1));
    const requestCount = calls.length;

    rerender();
    rerender();

    expect(calls).toHaveLength(requestCount);
    unmount();
  });

  it("refetches only schema-dependent metadata when the schema changes", async () => {
    const { wrapper } = createWrapper();
    const { rerender, unmount } = renderHook(
      ({ selectedSchema }: { selectedSchema: string }) =>
        useSQLLabMetadata({
          selectedDS: "db-1",
          selectedSchema,
          selectedTable: null,
        }),
      { initialProps: { selectedSchema: "public" }, wrapper },
    );

    for (const endpoint of endpoints) resolve(endpoint);
    await waitFor(() => expect(count("tables", "db-1", "public")).toBe(1));
    const before = calls.length;

    rerender({ selectedSchema: "analytics" });
    await waitFor(() => expect(count("tables", "db-1", "analytics")).toBe(1));

    expect(calls.length - before).toBe(14);
    expect(count("roles", "db-1")).toBe(1);
    expect(count("tablespaces", "db-1")).toBe(1);
    unmount();
  });

  it("scopes same-named table metadata to the current schema", async () => {
    const { wrapper } = createWrapper();
    const { result, rerender, unmount } = renderHook(
      ({ selectedSchema }: { selectedSchema: string }) =>
        useSQLLabMetadata({
          selectedDS: "db-1",
          selectedSchema,
          selectedTable: "users",
        }),
      { initialProps: { selectedSchema: "public" }, wrapper },
    );

    await waitFor(() => expect(count("indexes", "db-1", "public")).toBe(1));
    expect(requestMocks.indexes).toHaveBeenLastCalledWith("db-1", "users", "public");
    expect(requestMocks.foreignKeys).toHaveBeenLastCalledWith("db-1", "users", "public");
    expect(requestMocks.tableInfo).toHaveBeenLastCalledWith("db-1", "users", "public");
    expect(requestMocks.ddl).toHaveBeenLastCalledWith("db-1", "users", "public");
    expect(requestMocks.columns).toHaveBeenLastCalledWith("db-1", "users", "public");

    resolve("indexes", ["public-index"]);
    resolve("foreignKeys", ["public-fk"]);
    resolve("tableInfo", { schema: "public" });
    resolve("ddl", "public-ddl");
    resolve("columns", [{ schema: "public" }]);
    await waitFor(() => expect(result.current.indexes).toEqual(["public-index"]));

    rerender({ selectedSchema: "analytics" });
    await waitFor(() => expect(count("allColumns", "db-1", "analytics")).toBe(1));

    expect(count("indexes", "db-1", "analytics")).toBe(1);
    expect(count("foreignKeys", "db-1", "analytics")).toBe(1);
    expect(requestMocks.indexes).toHaveBeenLastCalledWith("db-1", "users", "analytics");
    expect(requestMocks.foreignKeys).toHaveBeenLastCalledWith("db-1", "users", "analytics");

    resolve("indexes", ["analytics-index"]);
    resolve("foreignKeys", ["analytics-fk"]);
    resolve("tableInfo", { schema: "analytics" });
    resolve("ddl", "analytics-ddl");
    resolve("columns", [{ schema: "analytics" }]);
    await waitFor(() => expect(result.current.indexes).toEqual(["analytics-index"]));
    expect(result.current.foreignKeys).toEqual(["analytics-fk"]);
    expect(result.current.tableInfo).toEqual({ schema: "analytics" });
    expect(result.current.tableDDL).toBe("analytics-ddl");
    expect(result.current.allColumns).toEqual([{ schema: "analytics" }]);
    unmount();
  });

  it("ignores an obsolete database response after switching databases", async () => {
    const { wrapper } = createWrapper();
    const { result, rerender, unmount } = renderHook(
      ({ selectedDS }: { selectedDS: string }) =>
        useSQLLabMetadata({
          selectedDS,
          selectedSchema: "public",
          selectedTable: null,
        }),
      { initialProps: { selectedDS: "db-1" }, wrapper },
    );

    await waitFor(() => expect(count("tables", "db-1", "public")).toBe(1));
    rerender({ selectedDS: "db-2" });
    await waitFor(() => expect(count("tables", "db-2", "public")).toBe(1));

    const currentTables = calls.find(
      (call) => call.endpoint === "tables" && call.databaseId === "db-2",
    );
    currentTables?.resolve(["current-table"]);
    await waitFor(() => expect(result.current.tables).toEqual(["current-table"]));

    const obsoleteTables = calls.find(
      (call) => call.endpoint === "tables" && call.databaseId === "db-1",
    );
    obsoleteTables?.resolve(["obsolete-table"]);
    await waitFor(() => expect(result.current.tables).toEqual(["current-table"]));
    unmount();
  });

  it("does not update an unmounted hook from deferred metadata responses", async () => {
    const { wrapper } = createWrapper();
    const { unmount } = renderHook(
      () =>
        useSQLLabMetadata({
          selectedDS: "db-1",
          selectedSchema: "public",
          selectedTable: null,
        }),
      { wrapper },
    );

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    unmount();
    for (const call of calls) call.resolve(["late-response"]);
    expect(calls.length).toBeGreaterThan(0);
  });
});
