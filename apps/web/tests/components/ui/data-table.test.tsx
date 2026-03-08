import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test-utils";
import * as React from "react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface TestData {
  id: string;
  name: string;
  email: string;
}

const columns: ColumnDef<TestData>[] = [
  { header: "Name", accessorKey: "name" },
  { header: "Email", accessorKey: "email" },
];

const data: TestData[] = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
];

describe("DataTable Component", () => {
  it("renders headers and data correctly", () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("filters data when searchKey is provided", async () => {
    render(<DataTable columns={columns} data={data} searchKey="name" />);

    const input = screen.getByPlaceholderText("Filter name...");
    fireEvent.change(input, { target: { value: "Jane" } });

    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);

    fireEvent.click(screen.getByText("John Doe"));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it("shows empty state when no data matches filter", () => {
    render(<DataTable columns={columns} data={data} searchKey="name" />);

    const input = screen.getByPlaceholderText("Filter name...");
    fireEvent.change(input, { target: { value: "Non-existent" } });

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });
});
