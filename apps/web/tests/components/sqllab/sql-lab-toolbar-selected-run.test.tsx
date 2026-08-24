/**
 * @file sql-lab-toolbar-selected-run.test.tsx
 * @description Focused coverage: the SQLLab toolbar Run action must prefer a
 * non-empty Monaco selection and fall back to the active-tab SQL (undefined
 * override) when the stored selection is empty or whitespace-only.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handleRun = vi.hoisted(() => vi.fn());

const labState = vi.hoisted(() => ({
  selectedSql: "",
}));

vi.mock("@/app/sqllab/context/SQLLabContext", () => {
  const noop = () => {};
  const lab = {
    selectedDS: "db-1",
    selectedDSType: "postgresql",
    isRelational: true,
    selectedSql: "",
    queryLimit: 1000,
    setQueryLimit: noop,
    showRightPanel: true,
    rightPanelMode: "object" as const,
    setShowRightPanel: noop,
    setRightPanelMode: noop,
    setShowAISidebar: noop,
    handleRun,
    handleStop: noop,
    handleExplain: noop,
    handleFormat: noop,
    handleSave: noop,
    handleOpen: noop,
    handleUndo: noop,
    handleRedo: noop,
    handleRollback: noop,
    handleImport: noop,
    handleExport: noop,
  };
  const result = {
    executing: false,
    autoCommit: true,
    setAutoCommit: noop,
  };
  return {
    useSQLLabContext: () => ({
      ...lab,
      selectedSql: labState.selectedSql,
      resolveSelectedSql: () => labState.selectedSql,
    }),
    useSQLLabResultContext: () => result,
  };
});

import { SQLLabToolbar } from "@/app/sqllab/components/SQLLabToolbar";

describe("SQLLabToolbar Run selection precedence", () => {
  beforeEach(() => {
    handleRun.mockClear();
    labState.selectedSql = "";
  });

  it("runs only the non-empty selected statement instead of the full tab SQL", async () => {
    // Active tab SQL holds two statements; the user selected only the second.
    labState.selectedSql = "SELECT * FROM ab_group";
    render(<SQLLabToolbar />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Run" }));

    expect(handleRun).toHaveBeenCalledTimes(1);
    expect(handleRun).toHaveBeenCalledWith("SELECT * FROM ab_group");
    expect(handleRun).not.toHaveBeenCalledWith(undefined);
  });

  it("passes a non-empty selection through unchanged, preserving its raw leading/trailing whitespace", async () => {
    labState.selectedSql = " SELECT 1 \n";
    render(<SQLLabToolbar />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Run" }));

    expect(handleRun).toHaveBeenCalledTimes(1);
    expect(handleRun).toHaveBeenCalledWith(" SELECT 1 \n");
    expect(handleRun).not.toHaveBeenCalledWith(undefined);
  });

  it("falls back to the active-tab SQL when the selection is whitespace-only", async () => {
    labState.selectedSql = "   \n\t ";
    render(<SQLLabToolbar />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Run" }));

    expect(handleRun).toHaveBeenCalledWith(undefined);
  });

  it("falls back to the active-tab SQL when no text was ever selected", async () => {
    labState.selectedSql = "";
    render(<SQLLabToolbar />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Run" }));

    expect(handleRun).toHaveBeenCalledWith(undefined);
  });
});
