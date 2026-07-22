import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("App routing", () => {
  it("does not register the retired standalone AI route", () => {
    const source = readFileSync(resolve(__dirname, "../src/App.tsx"), "utf8");

    expect(source).not.toContain("./app/ai/page");
    expect(source).not.toContain('path="/ai"');
  });
});
