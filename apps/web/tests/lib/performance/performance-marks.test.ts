import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearPerformanceMarks,
  markPerformance,
  measurePerformance,
  type PerformanceMarkName,
} from "@/lib/performance/performance-marks";

const performanceApi = {
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(() => ({ duration: 12 })),
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete (globalThis as { performance?: unknown }).performance;
});

describe("performance marks", () => {
  it("does nothing when the Performance API is unsupported", () => {
    expect(() => markPerformance("frontend_ready")).not.toThrow();
    expect(() => measurePerformance("startup", "desktop_spawn", "frontend_ready")).not.toThrow();
    expect(measurePerformance("startup", "desktop_spawn", "frontend_ready")).toBeNull();
    expect(() => clearPerformanceMarks()).not.toThrow();
  });

  it("is disabled outside development", () => {
    vi.stubEnv("DEV", false);
    Object.defineProperty(globalThis, "performance", { configurable: true, value: performanceApi });

    markPerformance("frontend_ready");
    measurePerformance("startup", "desktop_spawn", "frontend_ready");
    clearPerformanceMarks();

    expect(performanceApi.mark).not.toHaveBeenCalled();
    expect(performanceApi.measure).not.toHaveBeenCalled();
    expect(performanceApi.clearMarks).not.toHaveBeenCalled();
  });

  it.each([
    "desktop_spawn",
    "backend_ready",
    "frontend_ready",
    "route_mounted",
    "sqllab_mounted",
    "metadata_loaded",
    "result_rendered",
    "ai_first_token",
  ] as PerformanceMarkName[])("accepts the bounded event name %s", (name) => {
    Object.defineProperty(globalThis, "performance", { configurable: true, value: performanceApi });

    markPerformance(name);

    expect(performanceApi.mark).toHaveBeenCalledWith(name);
  });

  it("returns the measured duration", () => {
    Object.defineProperty(globalThis, "performance", { configurable: true, value: performanceApi });

    expect(measurePerformance("startup", "desktop_spawn", "frontend_ready")).toBe(12);
    expect(performanceApi.measure).toHaveBeenCalledWith("startup", "desktop_spawn", "frontend_ready");
  });

  it("clears development marks and measures", () => {
    Object.defineProperty(globalThis, "performance", { configurable: true, value: performanceApi });

    clearPerformanceMarks();
    clearPerformanceMarks();

    expect(performanceApi.clearMarks).toHaveBeenCalledTimes(2);
    expect(performanceApi.clearMeasures).toHaveBeenCalledTimes(2);
  });

  it("does not measure when a performance boundary is unsupported", () => {
    const unsupportedPerformance = {
      ...performanceApi,
      measure: undefined,
    };
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: unsupportedPerformance,
    });

    expect(measurePerformance("startup", "desktop_spawn", "frontend_ready")).toBeNull();
  });

  it("does not throw when clearing unsupported measures", () => {
    const unsupportedPerformance = {
      ...performanceApi,
      clearMeasures: undefined,
    };
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: unsupportedPerformance,
    });

    expect(() => clearPerformanceMarks()).not.toThrow();
  });
});
