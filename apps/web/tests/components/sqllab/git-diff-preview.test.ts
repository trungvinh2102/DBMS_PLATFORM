/**
 * @file git-diff-preview.test.ts
 * @description Tests for converting unified Git diffs into Monaco diff editor models.
 */

import { describe, expect, it } from "vitest";
import { buildDiffEditorModels } from "@/app/sqllab/components/workspace/GitDiffPreview";

describe("buildDiffEditorModels", () => {
  it("builds original and modified text without unified diff metadata", () => {
    const models = buildDiffEditorModels(
      [
        "diff --git a/sql/report.sql b/sql/report.sql",
        "index 123..456 100644",
        "--- a/sql/report.sql",
        "+++ b/sql/report.sql",
        "@@ -1,3 +1,3 @@",
        " SELECT *",
        "-LIMIT 5;",
        "+LIMIT 100;",
        "\\ No newline at end of file",
      ].join("\n"),
    );

    expect(models.original).toBe("SELECT *\nLIMIT 5;");
    expect(models.modified).toBe("SELECT *\nLIMIT 100;");
  });
});
