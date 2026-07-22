import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { exportData } from "@/lib/export";

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

  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("downloads CSV without using XLSX", async () => {
    const click = vi.fn();
    const anchor = document.createElement("a");
    anchor.click = click;
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchor);

    await exportData(MOCK_DATA, MOCK_COLUMNS, "csv", "test-file");

    expect(XLSX.utils.json_to_sheet).not.toHaveBeenCalled();
    expect(XLSX.writeFile).not.toHaveBeenCalled();
    expect(anchor.download).toBe("test-file.csv");
    expect(anchor.href).toBe("blob:mock-url");
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    createElementSpy.mockRestore();
  });

  it("handles empty data by logging a warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await exportData([], MOCK_COLUMNS, "csv", "empty-file");

    expect(warnSpy).toHaveBeenCalledWith("No data to export");
    warnSpy.mockRestore();
  });

  it("stringifies nested values in CSV output", async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob.type).toBe("text/csv;charset=utf-8");
      return "blob:complex-url";
    });
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });

    const anchor = document.createElement("a");
    anchor.click = vi.fn();
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchor);

    await exportData(
      [{ id: 1, meta: { active: true }, tags: ["a", "b"] }],
      ["id", "meta", "tags"],
      "csv",
      "complex-export",
    );

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.download).toBe("complex-export.csv");

    createElementSpy.mockRestore();
  });

  it("handles auto-width for xlsx export", async () => {
    const data = [{ id: 1, name: "Long name that takes space" }];
    const cols = ["id", "name"];

    await exportData(data, cols, "xlsx", "test-file");

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
      { id: 1, name: "Long name that takes space" },
    ]);
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "test-file.xlsx",
    );
  });
});
