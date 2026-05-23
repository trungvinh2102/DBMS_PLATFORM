/**
 * @file data-table-preview.test.tsx
 * @description Unit tests for the SQL Lab AI data table preview presentation.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTablePreview } from "@/app/sqllab/components/ai/DataTablePreview";

describe("DataTablePreview", () => {
  it("renders sample rows without the heavy glass shadow utility", () => {
    const { container } = render(
      <DataTablePreview
        columns={["id", "name"]}
        data={[{ id: 1, name: "Alice" }]}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveClass("glass-v2");
  });
});
