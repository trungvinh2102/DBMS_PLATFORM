/**
 * @file source-tree-panel.test.ts
 * @description Tests for SQL Lab workspace source tree data shaping.
 */

import { describe, expect, it } from "vitest";
import { buildSourceTree, filterSourceTree } from "@/app/sqllab/components/workspace/SourceTreePanel";

describe("buildSourceTree", () => {
  it("groups flat workspace files into sorted folders before files", () => {
    const tree = buildSourceTree([
      { path: "README.md", name: "README.md", type: "file" },
      { path: "sql/reports/revenue.sql", name: "revenue.sql", type: "file", gitStatus: "M" },
      { path: "sql", name: "sql", type: "folder" },
      { path: "sql/reports", name: "reports", type: "folder" },
      { path: "docs", name: "docs", type: "folder" },
    ]);

    expect(tree.map((node) => node.name)).toEqual(["docs", "sql", "README.md"]);
    expect(tree[1].children[0].name).toBe("reports");
    expect(tree[1].children[0].children[0]).toMatchObject({
      name: "revenue.sql",
      path: "sql/reports/revenue.sql",
      gitStatus: "M",
    });
  });
});

describe("filterSourceTree", () => {
  const tree = buildSourceTree([
    { path: "README.md", name: "README.md", type: "file" },
    { path: "sql/reports/monthly.sql", name: "monthly.sql", type: "file", gitStatus: "M" },
    { path: "sql/reports/yearly.sql", name: "yearly.sql", type: "file" },
    { path: "sql/archive/legacy.sql", name: "legacy.sql", type: "file" },
  ]);

  it("keeps ancestor folders for matching files", () => {
    const filtered = filterSourceTree(tree, "monthly");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].path).toBe("sql");
    expect(filtered[0].children[0].path).toBe("sql/reports");
    expect(filtered[0].children[0].children.map((node) => node.path)).toEqual(["sql/reports/monthly.sql"]);
  });

  it("keeps folder contents when a folder name matches", () => {
    const filtered = filterSourceTree(tree, "reports");

    expect(filtered[0].children[0].path).toBe("sql/reports");
    expect(filtered[0].children[0].children.map((node) => node.name)).toEqual(["monthly.sql", "yearly.sql"]);
  });
});
