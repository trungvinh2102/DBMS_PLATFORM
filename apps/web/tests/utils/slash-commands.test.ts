/**
 * @file slash-commands.test.ts
 * @description Regression tests for SQL Lab AI slash command prompt language.
 */

import { describe, expect, it } from "vitest";

import { filterCommands, parseSlashCommand } from "@/app/sqllab/utils/slash-commands";

const context = {
  editorSQL: "SELECT * FROM users;",
  args: "",
  databaseType: "postgresql",
  schema: "public",
};

describe("slash command prompt language", () => {
  it("wraps parsed slash command prompts with the Vietnamese response instruction", () => {
    const parsed = parseSlashCommand("/lineage");

    const prompt = parsed?.command.buildPrompt(context);

    expect(prompt).toContain("Hãy trả lời bằng tiếng Việt có dấu");
  });

  it("wraps filtered command prompts used by autocomplete selection", () => {
    const command = filterCommands("/perf")[0];

    const prompt = command.buildPrompt(context);

    expect(prompt).toContain("Hãy trả lời bằng tiếng Việt có dấu");
  });
});
