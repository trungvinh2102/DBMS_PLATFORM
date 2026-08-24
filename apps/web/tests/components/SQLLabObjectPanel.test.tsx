/**
 * @file SQLLabObjectPanel.test.tsx
 * @description Verifies the Object Info refresh control invokes and represents the selected-object refresh action.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SQLLabObjectPanel } from "@/app/sqllab/components/SQLLabObjectPanel";

const {
  refetchTablesMock,
  refreshSelectedObjectMock,
  refreshInProgress,
} = vi.hoisted(() => ({
  refetchTablesMock: vi.fn(),
  refreshSelectedObjectMock: vi.fn(),
  refreshInProgress: { current: false },
}));

vi.mock("@/app/sqllab/context/SQLLabContext", () => ({
  useSQLLabContext: () => ({
    activeRightTab: "data",
    allColumns: [],
    dataOffset: 0,
    defaultQueryLimit: 100,
    foreignKeys: [],
    handleUpdateData: vi.fn(),
    indexes: [],
    isDiagnosticsSupported: false,
    isLoadingColumns: false,
    isRefreshingSelectedObject: refreshInProgress.current,
    isRelational: true,
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    refetchTables: refetchTablesMock,
    refreshSelectedObject: refreshSelectedObjectMock,
    selectedDS: "db-1",
    selectedDSType: "postgresql",
    selectedObjectType: "table",
    selectedSchema: "public",
    selectedTable: "users",
    setActiveRightTab: vi.fn(),
    tableDDL: "",
    tableInfo: null,
    triggers: [],
  }),
  useSQLLabResultContext: () => ({
    currentTColumns: [],
    currentTData: [],
    executionTime: 0,
    loadingTData: false,
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

describe("SQLLabObjectPanel refresh control", () => {
  beforeEach(() => {
    refreshInProgress.current = false;
    vi.clearAllMocks();
  });

  it("refreshes the selected object", async () => {
    const user = userEvent.setup();
    render(<SQLLabObjectPanel />);

    await user.click(
      screen.getByRole("button", { name: "Refresh selected object" }),
    );

    expect(refreshSelectedObjectMock).toHaveBeenCalledOnce();
    expect(refetchTablesMock).not.toHaveBeenCalled();
  });

  it("disables the refresh control while an object refresh is running", () => {
    refreshInProgress.current = true;
    render(<SQLLabObjectPanel />);

    expect(
      screen.getByRole("button", { name: "Refresh selected object" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Refresh selected object" }),
    ).toHaveAttribute("aria-busy", "true");
  });
});
