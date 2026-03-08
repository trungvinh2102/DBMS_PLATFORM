/**
 * @file utils.test.ts
 * @description Unit tests for the cn (classNames) merge utility.
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("Utility: cn", () => {
  it("joins simple classes together", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("handles conditional classes logic", () => {
    const isError = true;
    const isSuccess = false;
    expect(cn("base", isError && "text-red", isSuccess && "text-green")).toBe(
      "base text-red",
    );
  });

  it("merges tailwind conflicts correctly using twMerge", () => {
    // twMerge handles px-2 py-2 p-4 by prioritizing p-4
    expect(cn("px-2 py-2", "p-4")).toBe("p-4");
  });

  it("safely handles falsy values", () => {
    expect(cn("base", null, undefined, false, "")).toBe("base");
  });
});
