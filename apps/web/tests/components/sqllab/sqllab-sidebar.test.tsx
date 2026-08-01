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
});
