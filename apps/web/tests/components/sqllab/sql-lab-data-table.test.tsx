/**
 * @file sql-lab-data-table.test.tsx
 * @description Regression tests for the SQL Lab query result table layout.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SQLLabDataTable } from "@/app/sqllab/components/SQLLabDataTable";

function getColWidth(col: HTMLTableColElement) {
  return Number(col.style.width.replace("px", ""));
}

describe("SQLLabDataTable", () => {
  it("uses precomputed fixed column widths instead of auto max-content layout", () => {
    const { container } = render(
      <SQLLabDataTable
        columns={["id", "description"]}
        data={[
          {
            id: 1,
            description:
              "A deliberately long result value that should drive a wider result column.",
          },
        ]}
      />,
    );

    const table = screen.getByRole("table");
    const cols = Array.from(container.querySelectorAll("col"));
    const idWidth = getColWidth(cols[1]);
    const descriptionWidth = getColWidth(cols[2]);

    expect(table).toHaveClass("table-fixed");
    expect(table).not.toHaveClass("table-auto");
    expect(cols).toHaveLength(3);
    expect(descriptionWidth).toBeGreaterThan(idWidth);
    expect(table).toHaveStyle({
      width: `${getColWidth(cols[0]) + idWidth + descriptionWidth}px`,
    });
  });
});
