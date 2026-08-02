export type PerformanceMarkName =
  | "desktop_spawn"
  | "backend_ready"
  | "frontend_ready"
  | "route_mounted"
  | "sqllab_mounted"
  | "metadata_loaded"
  | "result_rendered"
  | "ai_first_token";

export type PerformanceMeasureName = "startup";

function getPerformance(): Performance | null {
  if (!import.meta.env.DEV || typeof globalThis.performance === "undefined") return null;
  return globalThis.performance;
}

export function markPerformance(name: PerformanceMarkName): void {
  const performanceApi = getPerformance();
  if (typeof performanceApi?.mark !== "function") return;

  try {
    performanceApi.mark(name);
  } catch {
    // Performance instrumentation must never affect application behavior.
  }
}

export function measurePerformance(
  name: PerformanceMeasureName,
  start: PerformanceMarkName,
  end: PerformanceMarkName,
): number | null {
  const performanceApi = getPerformance();
  if (typeof performanceApi?.measure !== "function") return null;

  try {
    return performanceApi.measure(name, start, end).duration;
  } catch {
    return null;
  }
}

export function clearPerformanceMarks(): void {
  const performanceApi = getPerformance();
  if (typeof performanceApi?.clearMarks === "function") {
    performanceApi.clearMarks();
  }
  if (typeof performanceApi?.clearMeasures === "function") {
    performanceApi.clearMeasures();
  }
}
