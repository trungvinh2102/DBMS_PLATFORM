/**
 * @file slash-commands.test.ts
 * @description Regression tests for SQL Lab AI slash command prompt language.
 */

import { describe, expect, it } from "vitest";

import {
  filterCommands,
  parseSlashCommand,
  SLASH_COMMANDS,
} from "@/app/sqllab/utils/slash-commands";

const context = {
  editorSQL: "SELECT * FROM users;",
  args: "",
  databaseType: "postgresql",
};

describe("slash command prompt language", () => {
  it("wraps parsed slash command prompts with the Vietnamese response instruction", () => {
    const parsed = parseSlashCommand("/explain");

    const prompt = parsed?.command.buildPrompt(context);

    expect(prompt).toContain("Hãy trả lời bằng tiếng Việt có dấu");
  });

  it("wraps filtered command prompts used by autocomplete selection", () => {
    const command = filterCommands("/opt")[0];

    const prompt = command.buildPrompt(context);

    expect(prompt).toContain("Hãy trả lời bằng tiếng Việt có dấu");
  });

  it("only exposes the supported slash commands", () => {
    expect(SLASH_COMMANDS.map((cmd) => cmd.command)).toEqual([
      "/explain",
      "/optimize",
      "/fix",
      "/suggest",
    ]);
  });

  it("does not parse removed slash commands", () => {
    for (const command of ["/describe", "/perf", "/lineage", "/quality", "/schema"]) {
      expect(parseSlashCommand(command)).toBeNull();
    }
  });
});
