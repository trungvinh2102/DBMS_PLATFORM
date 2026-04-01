import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

// Additional edge-case tests for cn utility (complements existing utils.test.ts)
describe("cn - extended", () => {
  it("merges multiple classes", () => {
    const result = cn("bg-red-500", "text-white");
    expect(result).toContain("bg-red-500");
    expect(result).toContain("text-white");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("base");
    expect(result).toContain("active");
  });

  it("filters out falsy values", () => {
    const result = cn("base", false, null, undefined, 0, "");
    expect(result).toBe("base");
  });

  it("merges tailwind conflicting classes (last wins)", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toContain("bg-blue-500");
    expect(result).not.toContain("bg-red-500");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles array of classes", () => {
    const result = cn(["bg-red-500", "text-white"]);
    expect(result).toContain("bg-red-500");
    expect(result).toContain("text-white");
  });
});
