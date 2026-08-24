/**
 * @file sql-lab-sql-write-run-sync.test.tsx
 * @description Regression: every active-tab SQL write path (format,
 * saved-query load) must update the synchronous SQL mirror and drop the
 * stored selection eagerly — before React commits — so a Run issued inside
 * the same batched interaction as the mutation executes the NEW full tab
 * content, never a stale selection validated against a stale mirror.
 */

import { act, fireEvent, render, screen, waitFor } from "../../test-utils";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "sql-formatter";

const { executeMock, editorInstances } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  editorInstances: [] as Record<string, any>[],
}));

vi.mock("@/lib/api-client", () => ({
  databaseApi: {
    list: vi.fn(async () => ({
      data: [{ id: "db-1", type: "postgresql", databaseName: "pg-local" }],
    })),
    getSchemas: vi.fn(async () => ["public"]),
    getTables: vi.fn(async () => []),
    getViews: vi.fn(async () => []),
    getFunctions: vi.fn(async () => []),
    getProcedures: vi.fn(async () => []),
    getTriggers: vi.fn(async () => []),
    getEvents: vi.fn(async () => []),
    getMaterializedViews: vi.fn(async () => []),
    getSequences: vi.fn(async () => []),
    getPartitions: vi.fn(async () => []),
    getRoles: vi.fn(async () => []),
    getGrants: vi.fn(async () => []),
    getTablespaces: vi.fn(async () => []),
    getExtensions: vi.fn(async () => []),
    getSynonyms: vi.fn(async () => []),
    getJobs: vi.fn(async () => []),
    getIndexes: vi.fn(async () => []),
    getForeignKeys: vi.fn(async () => []),
    getTableInfo: vi.fn(async () => null),
    getDDL: vi.fn(async () => ""),
    getColumns: vi.fn(async () => []),
    getAllColumns: vi.fn(async () => []),
    listSavedQueries: vi.fn(async () => []),
    saveQuery: vi.fn(async () => ({ id: "sq-1" })),
    execute: executeMock,
    getExplainPlan: vi.fn(async () => ({})),
  },
}));

// Same editor mock contract as sql-lab-selection-run.test.tsx.
vi.mock("@/lib/monaco/MonacoEditor", async () => {
  const React = await import("react");
  const SQLEditor = (props: Record<string, any>) => {
    const reportSelection = (text: string) => {
      props.onSelectionChange?.(text, {
        ownerSql: String(props.value ?? ""),
        sessionId: String(props.selectionSessionId ?? ""),
      });
    };
    editorInstances.push({ ...props, reportSelection });
    return (
      <div data-testid="sql-editor" data-editor-value={String(props.value)} />
    );
  };
  return { SQLEditor };
});

import { SQLLabProvider, useSQLLabContext } from "@/app/sqllab/context/SQLLabContext";
import { SQLLabToolbar } from "@/app/sqllab/components/SQLLabToolbar";
import { SQLLabEditorContainer } from "@/app/sqllab/components/SQLLabEditorContainer";

/** Drives the production saved-query load handler through the real context. */
function SavedQueryLoadProbe({ saved }: { saved: Record<string, any> }) {
  const lab = useSQLLabContext();
  return (
    <button onClick={() => lab.handleSelectSavedQuery(saved)}>
      load-saved-probe
    </button>
  );
}

function Harness({ saved }: { saved?: Record<string, any> }) {
  return (
    <SQLLabProvider>
      <SQLLabToolbar />
      <SQLLabEditorContainer enableValidation={false} />
      {saved ? <SavedQueryLoadProbe saved={saved} /> : null}
    </SQLLabProvider>
  );
}

const MULTI_SQL = "SELECT * FROM ab_user\n\nSELECT * FROM ab_group";
const STALE_SELECTION = "SELECT * FROM ab_group";

const seedOneTab = (sql: string) => {
  localStorage.setItem(
    "sqllab_tabs",
    JSON.stringify([
      {
        id: "tab-a",
        name: "console_a",
        sql,
        selectedDS: "",
        selectedSchema: "",
        results: [],
        columns: [],
        error: null,
      },
    ]),
  );
  localStorage.setItem("sqllab_active_tab", "tab-a");
};

const latestEditor = () => editorInstances[editorInstances.length - 1];

async function setupWithSelection(sql = MULTI_SQL) {
  seedOneTab(sql);
  render(<Harness />);
  await waitFor(() =>
    expect(screen.getByTestId("sql-editor")).toHaveAttribute(
      "data-editor-value",
      sql,
    ),
  );
  const runButton = screen.getByRole("button", { name: "Run" });
  await waitFor(() => expect(runButton).toBeEnabled());

  // A valid selection exists for the current content...
  act(() => {
    latestEditor().onSelectionChange?.(STALE_SELECTION);
  });
  return runButton;
}

describe("active-tab SQL writes invalidate selection synchronously for same-batch Run", () => {
  beforeEach(() => {
    editorInstances.length = 0;
    executeMock.mockReset();
    executeMock.mockResolvedValue({ data: [], columns: [] });
    localStorage.clear();
  });

  it("runs the formatted full SQL when Format and Run share one batched interaction", async () => {
    const runButton = await setupWithSelection();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Format" }));
      fireEvent.click(runButton);
    });

    await waitFor(() => expect(executeMock).toHaveBeenCalledTimes(1));
    // The new full formatted content must reach execute — not the stale
    // selection that was valid against the pre-format mirror.
    expect(executeMock.mock.calls[0][1]).toBe(
      format(MULTI_SQL, { language: "postgresql" }),
    );
    expect(executeMock.mock.calls[0][1]).not.toBe(STALE_SELECTION);
    // The write persisted to the tab state as well.
    await waitFor(() =>
      expect(screen.getByTestId("sql-editor")).toHaveAttribute(
        "data-editor-value",
        format(MULTI_SQL, { language: "postgresql" }),
      ),
    );
  });

  it("runs the loaded saved query when handleSelectSavedQuery and Run share one batched interaction", async () => {
    const saved = {
      id: "sq-1",
      name: "Loaded Q",
      sql: "SELECT 'loaded';",
      databaseId: "db-1",
    };
    seedOneTab(MULTI_SQL);
    render(<Harness saved={saved} />);
    await waitFor(() =>
      expect(screen.getByTestId("sql-editor")).toHaveAttribute(
        "data-editor-value",
        MULTI_SQL,
      ),
    );
    const runButton = screen.getByRole("button", { name: "Run" });
    await waitFor(() => expect(runButton).toBeEnabled());
    act(() => {
      latestEditor().onSelectionChange?.(STALE_SELECTION);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("load-saved-probe"));
      fireEvent.click(runButton);
    });

    await waitFor(() => expect(executeMock).toHaveBeenCalledTimes(1));
    expect(executeMock.mock.calls[0][1]).toBe("SELECT 'loaded';");
    expect(executeMock.mock.calls[0][1]).not.toBe(STALE_SELECTION);
    await waitFor(() =>
      expect(screen.getByTestId("sql-editor")).toHaveAttribute(
        "data-editor-value",
        "SELECT 'loaded';",
      ),
    );
  });
});
