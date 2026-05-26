import { describe, expect, it } from "vitest";

import { flattenSchemaColumnsForAutocomplete } from "@/app/sqllab/hooks/use-sqllab-metadata";

describe("flattenSchemaColumnsForAutocomplete", () => {
  it("flattens all-columns metadata and attaches table names", () => {
    expect(
      flattenSchemaColumnsForAutocomplete({
        users: [{ name: "id", type: "INTEGER" }],
        orders: [{ name: "user_id", type: "INTEGER" }],
      }),
    ).toEqual([
      {
        name: "id",
        type: "INTEGER",
        table: "users",
        tableName: "users",
        table_name: "users",
      },
      {
        name: "user_id",
        type: "INTEGER",
        table: "orders",
        tableName: "orders",
        table_name: "orders",
      },
    ]);
  });

  it("keeps array metadata usable for single-table fallbacks", () => {
    expect(flattenSchemaColumnsForAutocomplete([{ name: "email" }])).toEqual([
      { name: "email" },
    ]);
  });
});
