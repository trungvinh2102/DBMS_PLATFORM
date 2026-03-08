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
  TableFooter,
  TableCaption,
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

  it("renders with footer and caption", () => {
    render(
      <Table>
        <TableCaption>Test Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Body</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByText("Test Caption")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders with alternate classes passed to components", () => {
    render(
      <Table className="table-auto">
        <TableBody>
          <TableRow />
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole("table");
    expect(table).toHaveClass("table-auto");
  });
});
