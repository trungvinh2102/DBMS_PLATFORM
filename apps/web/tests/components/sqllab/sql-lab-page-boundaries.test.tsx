/**
 * @file sql-lab-page-boundaries.test.tsx
 * @description Regression coverage for the SQL Lab page layout boundary.
 */

import React from "react";
import { act, fireEvent, render, waitFor } from "../../test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useSQLLabMock, sidebarRenders, toolbarRenders, resultRenders, editorRenders, dialogRenders } = vi.hoisted(() => ({
  useSQLLabMock: vi.fn(),
  sidebarRenders: vi.fn(),
  toolbarRenders: vi.fn(),
  resultRenders: vi.fn(),
  editorRenders: vi.fn(),
  dialogRenders: vi.fn(),
}));
const stableEmpty: never[] = [];

vi.mock("@/app/sqllab/hooks/useSQLLab", () => ({ useSQLLab: useSQLLabMock }));
vi.mock("@/lib/performance/performance-marks", () => ({ markPerformance: vi.fn() }));
vi.mock("@/app/sqllab/components/SQLLabSidebar", () => ({
  SQLLabSidebar: () => { sidebarRenders(); return <div data-testid="sidebar" />; },
}));
vi.mock("@/app/sqllab/components/SQLLabToolbar", () => ({
  SQLLabToolbar: () => { toolbarRenders(); return <div data-testid="toolbar" />; },
}));
vi.mock("@/app/sqllab/components/SQLLabResultPanel", () => ({
  SQLLabResultPanel: () => { resultRenders(); return <div data-testid="result-panel" />; },
}));
vi.mock("@/app/sqllab/components/SQLLabEditorContainer", () => ({
  SQLLabEditorContainer: () => {
    editorRenders();
    const editor = useSQLLabEditorContext();
    const lab = useSQLLabContext();
    return (
      <>
        <button type="button" onClick={() => editor.setSql("SELECT * FROM users;")}>Update SQL</button>
        <button type="button" onClick={() => editor.setActiveTabId("2")}>Switch tab</button>
        <button type="button" onClick={() => lab.renameTab("2", "renamed")}>Rename tab</button>
      </>
    );
  },
}));
vi.mock("@/app/sqllab/components/Skeletons", () => ({ PanelSkeleton: () => null }));
vi.mock("@/app/sqllab/components/SaveQueryDialog", () => ({
  SaveQueryDialog: ({ defaultName }: { defaultName?: string }) => {
    dialogRenders();
    return <output data-testid="dialog-default-name">{defaultName}</output>;
  },
}));
vi.mock("@/app/sqllab/components/OpenQueryDialog", () => ({ OpenQueryDialog: () => null }));
vi.mock("@/app/sqllab/components/SchemaContent", () => ({ SchemaContent: () => null }));
vi.mock("@/app/sqllab/components/import/ImportWizardModal", () => ({ ImportWizardModal: () => null }));
vi.mock("@/app/sqllab/components/SQLLabObjectPanel", () => ({ SQLLabObjectPanel: () => null }));
vi.mock("@/app/sqllab/components/SQLLabHistoryPanel", () => ({ SQLLabHistoryPanel: () => null }));
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => null,
}));

import SQLLabPage from "@/app/sqllab/page";
import { useSQLLabContext, useSQLLabEditorContext } from "@/app/sqllab/context/SQLLabContext";

describe("SQL Lab page layout boundary", () => {
  beforeEach(() => {
    sidebarRenders.mockClear();
    toolbarRenders.mockClear();
    resultRenders.mockClear();
    editorRenders.mockClear();
    dialogRenders.mockClear();
    useSQLLabMock.mockImplementation(() => {
      const [sql, setSql] = React.useState("SELECT 1;");
      const [activeTabId, setActiveTabId] = React.useState("1");
      const [tabs, setTabs] = React.useState([
        { id: "1", name: "console_1", sql: "SELECT 1;", results: stableEmpty, columns: stableEmpty, error: null },
        { id: "2", name: "console_2", sql: "SELECT 2;", results: stableEmpty, columns: stableEmpty, error: null },
      ]);
      return {
        sql,
        setSql,
        tabs: tabs.map((tab) => tab.id === activeTabId ? { ...tab, sql } : tab),
        activeTabId,
        activeTab: undefined,
        setActiveTabId,
        renameTab: (id: string, name: string) => setTabs((currentTabs) => currentTabs.map((tab) => tab.id === id ? { ...tab, name } : tab)),
        cursorPos: { lineNumber: 1, column: 1 },
        setCursorPos: vi.fn(),
        results: stableEmpty,
        columns: stableEmpty,
        error: null,
        executing: false,
        executionTime: 0,
        currentTData: stableEmpty,
        currentTColumns: stableEmpty,
        loadingTData: false,
        activeResultTab: "results",
        setActiveResultTab: vi.fn(),
        showAISidebar: false,
        showRightPanel: false,
        rightPanelMode: "schema",
        selectedDS: "db-1",
        selectedSchema: "public",
        dataSources: stableEmpty,
        isLoadingColumns: false,
        isSaveDialogOpen: false,
        isOpenDialogOpen: false,
        isImportWizardOpen: false,
        savedQueries: stableEmpty,
        setIsSaveDialogOpen: vi.fn(),
        setIsOpenDialogOpen: vi.fn(),
        setIsImportWizardOpen: vi.fn(),
        handleSaveConfirmed: vi.fn(),
        handleSelectSavedQuery: vi.fn(),
        tabSize: 4,
      };
    });
  });

  it("does not rerender layout sections when editor SQL changes", () => {
    const view = render(<SQLLabPage />);

    expect(sidebarRenders).toHaveBeenCalledTimes(1);
    expect(toolbarRenders).toHaveBeenCalledTimes(1);
    expect(resultRenders).toHaveBeenCalledTimes(1);
    expect(editorRenders).toHaveBeenCalledTimes(1);

    act(() => fireEvent.click(view.getByRole("button", { name: "Update SQL" })));

    expect(sidebarRenders).toHaveBeenCalledTimes(1);
    expect(toolbarRenders).toHaveBeenCalledTimes(1);
    expect(resultRenders).toHaveBeenCalledTimes(1);
    expect(editorRenders.mock.calls.length).toBeGreaterThan(1);
  });

  it("keeps dialogs stable for SQL edits while updating the active tab name", async () => {
    const view = render(<SQLLabPage />);

    await waitFor(() => expect(view.getByTestId("dialog-default-name")).toHaveTextContent("console_1"));
    const initialDialogRenders = dialogRenders.mock.calls.length;

    act(() => fireEvent.click(view.getByRole("button", { name: "Update SQL" })));
    expect(dialogRenders).toHaveBeenCalledTimes(initialDialogRenders);

    act(() => fireEvent.click(view.getByRole("button", { name: "Switch tab" })));
    expect(view.getByTestId("dialog-default-name")).toHaveTextContent("console_2");
    expect(dialogRenders).toHaveBeenCalledTimes(initialDialogRenders + 1);

    act(() => fireEvent.click(view.getByRole("button", { name: "Rename tab" })));
    expect(view.getByTestId("dialog-default-name")).toHaveTextContent("renamed");
    expect(dialogRenders).toHaveBeenCalledTimes(initialDialogRenders + 2);
  });
});
