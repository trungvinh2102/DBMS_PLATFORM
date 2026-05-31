import { describe, expect, it } from "vitest";
import { buildUnifiedDiff } from "../../src/app/sqllab/utils/unified-diff";

describe("buildUnifiedDiff", () => {
  it("renders deleted lines with unified diff markers", () => {
    const diff = buildUnifiedDiff(
      "SELECT 1;\nSELECT 2;\nSELECT 3;",
      "SELECT 1;\nSELECT 3;",
      "sql/report.sql",
    );

    expect(diff).toContain("--- a/sql/report.sql");
    expect(diff).toContain("+++ b/sql/report.sql");
    expect(diff).toContain("@@ -1,3 +1,2 @@");
    expect(diff).toContain("-SELECT 2;");
  });

  it("returns empty output for identical content", () => {
    expect(buildUnifiedDiff("SELECT 1;", "SELECT 1;", "sql/report.sql")).toBe("");
  });
});
