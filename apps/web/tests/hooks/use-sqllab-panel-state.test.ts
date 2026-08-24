import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSQLLab } from "@/app/sqllab/hooks/useSQLLab";

const { refetchAllMock, tableDataMutationMock } = vi.hoisted(() => ({
  refetchAllMock: vi.fn(),
  tableDataMutationMock: {
    data: undefined,
    isPending: false,
    variables: undefined,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams()],
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/sqllab" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => tableDataMutationMock,
}));

vi.mock("@/stores/use-settings-store", () => ({
  useSettingsStore: () => ({
    defaultQueryLimit: 100,
    resultEncoding: "utf-8",
    editorFormatOnSave: false,
  }),
}));

vi.mock("@/app/sqllab/hooks/use-sqllab-tabs", () => ({
  useSQLLabTabs: () => ({
    tabs: [],
    activeTabId: "tab-1",
    setActiveTabId: vi.fn(),
    activeTab: {
      selectedDS: "db-1",
      selectedSchema: "public",
      sql: "",
      savedQueryId: null,
      name: "Untitled",
      results: [],
      columns: [],
      error: null,
    },
    addTab: vi.fn(),
    closeTab: vi.fn(),
    renameTab: vi.fn(),
    updateActiveTab: vi.fn(),
  }),
}));

vi.mock("@/app/sqllab/hooks/use-sqllab-metadata", () => ({
  useSQLLabMetadata: () => ({
    dataSources: [{ id: "db-1", type: "postgresql" }],
    schemas: [],
    isLoadingSchemas: false,
    tables: [],
    refetchTables: refetchAllMock,
    isLoadingTables: false,
    isLoadingColumns: false,
    allColumns: [],
    autocompleteColumns: [],
    indexes: [],
    foreignKeys: [],
    tableInfo: null,
    tableDDL: null,
    refetchAll: refetchAllMock,
    views: [],
    events: [],
    functions: [],
    procedures: [],
    triggers: [],
    materializedViews: [],
    sequences: [],
    partitions: [],
    roles: [],
    grants: [],
    tablespaces: [],
    extensions: [],
    synonyms: [],
    jobs: [],
  }),
}));

vi.mock("@/app/sqllab/hooks/use-sqllab-query", () => ({
  useSQLLabQuery: () => ({
    handleRun: vi.fn(),
    handleExplain: vi.fn(),
    handleFormat: vi.fn(),
    handleStop: vi.fn(),
    executing: false,
    runSQLMutation: { data: undefined },
    explainSQLMutation: { data: undefined },
    saveQueryMutation: { mutateAsync: vi.fn() },
    savedQueries: [],
    refetchSavedQueries: vi.fn(),
  }),
}));

vi.mock("@/app/sqllab/hooks/use-sqllab-actions", () => ({
  useSQLLabActions: () => ({ handleExport: vi.fn() }),
}));

describe("useSQLLab right panel state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableDataMutationMock.mutateAsync.mockResolvedValue({ data: [], columns: [] });
  });
  it("opens Object Info when a table changes from no selection to users", () => {
    const { result } = renderHook(() => useSQLLab());

    act(() => {
      result.current.setShowRightPanel(false);
      result.current.setSelectedTable("users");
    });

    expect(result.current.showRightPanel).toBe(true);
    expect(result.current.rightPanelMode).toBe("object");
  });

  it("keeps Object Info collapsed while users remains selected", () => {
    const { result } = renderHook(() => useSQLLab());

    act(() => result.current.setSelectedTable("users"));
    act(() => result.current.setShowRightPanel(false));

    expect(result.current.showRightPanel).toBe(false);
  });

  it.each(["history", "schema"] as const)(
    "keeps the manually selected %s mode collapsed while users remains selected",
    (mode) => {
      const { result } = renderHook(() => useSQLLab());

      act(() => result.current.setSelectedTable("users"));
      act(() => {
        result.current.setRightPanelMode(mode);
        result.current.setShowRightPanel(false);
      });

      expect(result.current.showRightPanel).toBe(false);
      expect(result.current.rightPanelMode).toBe(mode);
    },
  );

  it("opens Object Info when selection changes from users to orders", () => {
    const { result } = renderHook(() => useSQLLab());

    act(() => result.current.setSelectedTable("users"));
    act(() => result.current.setShowRightPanel(false));
    act(() => result.current.setSelectedTable("orders"));

    expect(result.current.showRightPanel).toBe(true);
    expect(result.current.rightPanelMode).toBe("object");
  });

  it("exposes sidebar metadata from the composed hook", () => {
    const { result } = renderHook(() => useSQLLab());

    expect(result.current.dataSources).toEqual([
      { id: "db-1", type: "postgresql" },
    ]);
    expect(result.current.schemas).toEqual([]);
    expect(result.current.tables).toEqual([]);
    expect(result.current.views).toEqual([]);
  });

  it("refreshes selected table metadata and data preview on demand", async () => {
    const { result } = renderHook(() => useSQLLab());

    act(() => result.current.setSelectedTable("users"));
    vi.clearAllMocks();

    await act(async () => {
      await result.current.refreshSelectedObject();
    });

    expect(refetchAllMock).toHaveBeenCalledOnce();
    expect(tableDataMutationMock.mutateAsync).toHaveBeenCalledWith({
      databaseId: "db-1",
      sql: 'SELECT * FROM "users" LIMIT 100 OFFSET 0',
    });
    expect(result.current.selectedObjectRefreshVersion).toBe(1);
  });
});
