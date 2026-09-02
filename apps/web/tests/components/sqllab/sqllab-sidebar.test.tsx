import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test-utils";
import { SQLLabSidebar } from "@/app/sqllab/components/SQLLabSidebar";

const { mockLab } = vi.hoisted(() => ({
  mockLab: {
    activeLeftView: "database",
    setActiveLeftView: vi.fn(),
    dataSources: [
      {
        id: "connection-1",
        name: "Local PostgreSQL",
        type: "postgresql",
        host: "127.0.0.1",
        port: 5432,
      },
    ],
    selectedDS: "connection-1",
    setSelectedDS: vi.fn(),
    schemas: ["public"],
    selectedSchema: "public",
    setSelectedSchema: vi.fn(),
    selectedDSType: "postgresql",
    isRelational: true,
    tables: ["users", "orders"],
    views: [],
    functions: [],
    procedures: [],
    triggers: [],
    events: [],
    materializedViews: [],
    sequences: [],
    partitions: [],
    roles: [],
    grants: [],
    tablespaces: [],
    extensions: [],
    synonyms: [],
    jobs: [],
    selectedTable: null,
    isLoadingTables: false,
    isFetchingTables: false,
    refetchTables: vi.fn(),
    setSelectedTable: vi.fn(),
    setSql: vi.fn(),
    handleRun: vi.fn(),
  },
}));

vi.mock("@/app/sqllab/context/SQLLabContext", () => ({
  useSQLLabContext: () => mockLab,
}));

describe("SQLLabSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Database tree directly without an activity rail", () => {
    render(<SQLLabSidebar />);

    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Databases" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Repository" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Source Control" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Git Graph" })).not.toBeInTheDocument();
  });

  it("keeps database object selection working", async () => {
    const user = userEvent.setup();
    render(<SQLLabSidebar />);

    await user.click(screen.getByText("users"));

    expect(mockLab.setSelectedTable).toHaveBeenCalledWith("users");
  });

  it("shows refresh feedback during pending manual refresh while keeping cached tables visible", async () => {
    const user = userEvent.setup();
    mockLab.isFetchingTables = true;
    mockLab.isLoadingTables = false;
    mockLab.tables = ["users", "orders"];

    const { rerender } = render(<SQLLabSidebar />);

    const refreshBtn = screen.getByRole("button", { name: "Refresh tables" });
    expect(refreshBtn).toBeInTheDocument();
    expect(refreshBtn).toBeDisabled();
    expect(refreshBtn).toHaveAttribute("aria-busy", "true");

    const refreshIcon = screen.getByTestId("tables-refresh-icon");
    expect(refreshIcon).toHaveClass("animate-spin", "opacity-100");
    expect(refreshIcon).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("users")).toBeVisible();
    expect(screen.queryByTestId("tables-skeleton")).not.toBeInTheDocument();

    await user.click(refreshBtn);
    expect(mockLab.refetchTables).not.toHaveBeenCalled();

    // Rerender idle state
    mockLab.isFetchingTables = false;
    rerender(<SQLLabSidebar />);

    const idleRefreshBtn = screen.getByRole("button", { name: "Refresh tables" });
    expect(idleRefreshBtn).not.toBeDisabled();
    expect(idleRefreshBtn).toHaveAttribute("aria-busy", "false");
    expect(screen.getByTestId("tables-refresh-icon")).not.toHaveClass("animate-spin");

    await user.click(idleRefreshBtn);
    expect(mockLab.refetchTables).toHaveBeenCalledTimes(1);
    expect(screen.getByText("users")).toBeVisible();
  });

  it("renders two skeleton pulse bars during initial tables load without cached items", () => {
    mockLab.isFetchingTables = true;
    mockLab.isLoadingTables = true;
    mockLab.tables = [];

    render(<SQLLabSidebar />);

    const skeleton = screen.getByTestId("tables-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton.querySelectorAll(".animate-pulse")).toHaveLength(2);
    expect(screen.queryByText("users")).not.toBeInTheDocument();
  });
});
