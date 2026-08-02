/**
 * @file sql-lab-data-table-performance.test.tsx
 * @description Regression/performance-oriented tests for SQLLabDataTable hot paths:
 * whole-dataset cloning, whole-dataset JSON.stringify, column-width scanning,
 * row virtualization, debounced filtering, and stale-dataset safety.
 *
 * Fixtures are deterministic (10k rows) and intentionally avoid memory-exploding
 * 1M-row cases. Column-width/JSON.stringify assertions rely on exact call/row
 * counts; the timing assertion uses a generous budget and logs measured ms.
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SQLLabDataTable,
  filterResultRows,
  estimateColumnWidths,
  COLUMN_WIDTH_SAMPLE_ROWS,
} from "@/app/sqllab/components/SQLLabDataTable";

function makeRows(count: number, base: (i: number) => Record<string, any>) {
  return Array.from({ length: count }, (_, i) => base(i));
}

describe("SQLLabDataTable hot paths", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("filters a 10k-row result set correctly (counts + empty state)", () => {
    vi.useFakeTimers();
    const data = makeRows(10000, (i) => ({
      id: i,
      name: `user-${i}`,
      team: i % 100 === 0 ? "platform" : "other",
    }));

    const { container } = render(
      <SQLLabDataTable columns={["id", "name", "team"]} data={data} />,
    );
    expect(container).toHaveTextContent("10000 of 10000 rows");

    const input = screen.getByPlaceholderText("Search in results...");
    fireEvent.change(input, { target: { value: "platform" } });
    act(() => vi.advanceTimersByTime(200));
    // Exactly the rows where i % 100 === 0 match "platform".
    expect(container).toHaveTextContent("100 of 10000 rows");

    fireEvent.change(input, { target: { value: "user-9999" } });
    act(() => vi.advanceTimersByTime(200));
    expect(container).toHaveTextContent("1 of 10000 rows");

    fireEvent.change(input, { target: { value: "no-such-value-xyz" } });
    act(() => vi.advanceTimersByTime(200));
    expect(container).toHaveTextContent("0 of 10000 rows");
    expect(container).toHaveTextContent("No matching rows found");
  });

  it("keeps typing responsive: deferred search applies only after debounce at 10k rows", () => {
    vi.useFakeTimers();
    const data = makeRows(10000, (i) => ({ id: i, name: `user-${i}` }));
    const { container } = render(
      <SQLLabDataTable columns={["id", "name"]} data={data} />,
    );
    const input = screen.getByPlaceholderText("Search in results...");

    fireEvent.change(input, { target: { value: "user-42" } });
    // Before the debounce fires the full result set stays visible.
    expect(container).toHaveTextContent("10000 of 10000 rows");

    act(() => vi.advanceTimersByTime(200));
    expect(container).toHaveTextContent("1 of 10000 rows");
  });

  it("does not clone the whole dataset while filtering and never mutates input rows", () => {
    const data = makeRows(10000, (i) => ({ id: i, name: `user-${i}` }));
    const rowsBefore = data[5000];

    const filtered = filterResultRows(data, ["id", "name"], "user-5000");
    expect(filtered).not.toBeNull();
    expect(filtered).toHaveLength(1);
    expect(filtered![0]._originalIndex).toBe(5000);
    // The filter returns the original row object reference, not a {...row} clone.
    expect(filtered![0].row).toBe(rowsBefore);
    // The input dataset is never mutated and never gains a _originalIndex key.
    expect(data[5000]).toBe(rowsBefore);
    expect(data[5000]).not.toHaveProperty("_originalIndex");

    expect(filterResultRows(data, ["id", "name"], "")).toBeNull();
    expect(filterResultRows(data, ["id", "name"], "   ")).toBeNull();
  });

  it("never performs whole-dataset JSON.stringify during column-width estimation", () => {
    const data = makeRows(10000, () => ({ meta: { v: "x" } }));
    const spy = vi.spyOn(JSON, "stringify");

    const widths = estimateColumnWidths(["meta"], data, "NULL");

    // Width estimation is bounded to a row sample, not a whole-dataset scan.
    expect(spy).toHaveBeenCalledTimes(COLUMN_WIDTH_SAMPLE_ROWS);
    expect(widths).toHaveLength(1);
    expect(widths[0]).toBeGreaterThan(0);
  });

  it("keeps column widths bounded when the widest value is far beyond the sample window", () => {
    const data = makeRows(10000, (i) => ({
      label: i === 9999 ? "x".repeat(5000) : `row-${i}`,
    }));
    const widths = estimateColumnWidths(["label"], data, "NULL");
    expect(widths[0]).toBeLessThan(1000);
  });

  it("renders only virtualized rows for a 10k-row dataset (with and without filter)", () => {
    vi.useFakeTimers();
    const data = makeRows(10000, (i) => ({ id: i, name: `user-${i}` }));
    const { container } = render(
      <SQLLabDataTable columns={["id", "name"]} data={data} />,
    );
    expect(container.querySelectorAll("tbody tr").length).toBeLessThan(200);

    const input = screen.getByPlaceholderText("Search in results...");
    fireEvent.change(input, { target: { value: "user-" } });
    act(() => vi.advanceTimersByTime(200));
    expect(container).toHaveTextContent("10000 of 10000 rows");
    expect(container.querySelectorAll("tbody tr").length).toBeLessThan(200);
  });

  it("keeps rendered column widths bounded for large result sets", () => {
    const data = makeRows(10000, (i) => ({
      label: i === 9999 ? "x".repeat(5000) : `row-${i}`,
    }));
    const { container } = render(
      <SQLLabDataTable columns={["label"]} data={data} />,
    );
    const cols = Array.from(container.querySelectorAll("col"));
    const labelWidth = Number(cols[1].style.width.replace("px", ""));
    expect(labelWidth).toBeLessThan(1000);
  });

  it("stale datasets cannot overwrite current results while a search is pending", () => {
    vi.useFakeTimers();
    const datasetA = [{ name: "alpha-1" }, { name: "alpha-2" }];
    const datasetB = [
      { name: "beta-1" },
      { name: "beta-2" },
      { name: "beta-3" },
    ];

    const { container, rerender } = render(
      <SQLLabDataTable columns={["name"]} data={datasetA} />,
    );
    expect(container).toHaveTextContent("2 of 2 rows");

    const input = screen.getByPlaceholderText("Search in results...");
    fireEvent.change(input, { target: { value: "alpha" } });

    // The dataset is replaced while the debounce is still pending.
    rerender(<SQLLabDataTable columns={["name"]} data={datasetB} />);

    act(() => vi.advanceTimersByTime(200));

    // The pending term is applied to the CURRENT dataset only: "alpha" matches
    // nothing in dataset B, and dataset A rows must not resurface.
    expect(container).toHaveTextContent("0 of 3 rows");
    expect(container).toHaveTextContent("No matching rows found");
  });

  it("benchmark: filters 10k rows on the main thread within budget", async () => {
    const data = makeRows(10000, (i) => ({
      id: i,
      name: `user-${i}`,
      group: i % 7 === 0 ? "alpha-team" : "beta-team",
    }));
    const { container } = render(
      <SQLLabDataTable columns={["id", "name", "group"]} data={data} />,
    );
    const input = screen.getByPlaceholderText("Search in results...");

    const start = performance.now();
    fireEvent.change(input, { target: { value: "alpha-team" } });
    await waitFor(() => {
      expect(container).not.toHaveTextContent("10000 of 10000 rows");
    });
    const durationMs = performance.now() - start;
    console.log(`[bench] 10k-row filter round-trip: ${durationMs.toFixed(1)}ms`);

    expect(container).toHaveTextContent(/^\d+ of 10000 rows/);
    expect(durationMs).toBeLessThan(2000);
  });
});
