/**
 * @file table.test.tsx
 * @description Unit tests for the Table component, ensuring tabular data renders in proper sections.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

describe("Table Component", () => {
  it("renders headers and cells accurately", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Data Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Column Header")).toBeInTheDocument();
    expect(screen.getByText("Data Cell")).toBeInTheDocument();
  });

  it("renders with alternate classes passed to components", () => {
    render(
      <Table className="table-auto">
        <TableBody>
          <TableRow />
        </TableBody>
      </Table>,
    );
    // Verify table has base-ui data attribute if present or custom class
    const table = screen.getByRole("table");
    expect(table).toHaveClass("table-auto");
  });
});
