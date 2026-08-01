/**
 * @file sql-lab-page.test.tsx
 * @description Regression coverage for keeping the SQL Lab lifecycle host mounted.
 */

import { render } from "../../test-utils";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLab, hostMounts } = vi.hoisted(() => ({
  getLab: vi.fn(),
  hostMounts: vi.fn(),
}));

vi.mock("@/app/sqllab/context/SQLLabContext", () => ({
  SQLLabProvider: ({ children }: { children: React.ReactNode }) => children,
  useSQLLabContext: getLab,
}));

vi.mock("@/app/sqllab/components/SQLLabEditorContainer", () => ({
  SQLLabEditorContainer: () => {
    React.useEffect(() => {
      hostMounts();
    }, []);
    return <div data-testid="sql-lab-lifecycle-host" />;
  },
}));

vi.mock("@/app/sqllab/components/SQLLabSidebar", () => ({
  SQLLabSidebar: () => null,
}));

vi.mock("@/app/sqllab/components/SQLLabToolbar", () => ({
  SQLLabToolbar: () => null,
}));

vi.mock("@/app/sqllab/components/SQLLabResultPanel", () => ({
  SQLLabResultPanel: () => null,
}));

vi.mock("@/app/sqllab/components/Skeletons", () => ({
  PanelSkeleton: () => null,
}));

vi.mock("@/app/sqllab/components/SaveQueryDialog", () => ({ SaveQueryDialog: () => null }));
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

const createLab = (showAISidebar: boolean) => ({
  showAISidebar,
  showRightPanel: true,
  rightPanelMode: "schema",
  selectedDS: "db-1",
  selectedSchema: "public",
  dataSources: [],
  tabs: [],
  savedQueries: [],
  isSaveDialogOpen: false,
  isOpenDialogOpen: false,
  isImportWizardOpen: false,
  setIsSaveDialogOpen: vi.fn(),
  setIsOpenDialogOpen: vi.fn(),
  setIsImportWizardOpen: vi.fn(),
  handleSaveConfirmed: vi.fn(),
  handleSelectSavedQuery: vi.fn(),
});

describe("SQL Lab page lifecycle host", () => {
  beforeEach(() => {
    hostMounts.mockClear();
  });

  it("keeps the lifecycle host mounted while switching Editor and AI modes", async () => {
    getLab.mockReturnValue(createLab(false));
    const { default: SQLLabPage } = await import("@/app/sqllab/page");
    const view = render(<SQLLabPage />);

    expect(hostMounts).toHaveBeenCalledTimes(1);

    getLab.mockReturnValue(createLab(true));
    view.rerender(<SQLLabPage />);
    getLab.mockReturnValue(createLab(false));
    view.rerender(<SQLLabPage />);

    expect(hostMounts).toHaveBeenCalledTimes(1);
    expect(view.getByTestId("sql-lab-lifecycle-host")).toBeInTheDocument();
  });
});
