/**
 * @file export.test.ts
 * @description Unit tests for the data export utility (CSV, XLSX) using mocks for the xlsx library.
 */

import { vi, describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { exportData } from "@/lib/export";

// Mock the entire xlsx library to avoid side effects
vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe("Utility: exportData", () => {
  const MOCK_DATA = [{ id: 1, name: "Admin" }];
  const MOCK_COLUMNS = ["id", "name"];

  it("calls the appropriate XLSX methods for a CSV export", () => {
    exportData(MOCK_DATA, MOCK_COLUMNS, "csv", "test-file");

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "test-file.csv",
    );
  });

  it("handles empty data by logging a warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    exportData([], MOCK_COLUMNS, "csv", "empty-file");

    expect(warnSpy).toHaveBeenCalledWith("No data to export");
    warnSpy.mockRestore();
  });
  it("handles object stringification for complex nested data", () => {
    const complexData = [{ id: 1, meta: { active: true }, tags: ["a", "b"] }];
    const complexCols = ["id", "meta", "tags"];
    exportData(complexData, complexCols, "csv", "complex-export");

    // The data should be stringified before json_to_sheet is called
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      { id: 1, meta: '{"active":true}', tags: '["a","b"]' },
    ]);
  });

  it("handles auto-width for xlsx export", () => {
    const data = [{ id: 1, name: "Long name that takes space" }];
    const cols = ["id", "name"];

    // xlsx format triggers the column width calculation
    exportData(data, cols, "xlsx", "test-file");

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "test-file.xlsx",
    );
  });
});
