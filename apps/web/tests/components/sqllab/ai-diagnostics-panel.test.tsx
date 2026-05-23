/**
 * @file ai-diagnostics-panel.test.tsx
 * @description Unit tests for the user-facing AI diagnostics panel.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AIDiagnosticsPanel } from "@/app/sqllab/components/ai/AIDiagnosticsPanel";

const baseProps = {
  isLoading: false,
  onRefresh: vi.fn(),
  onClose: vi.fn(),
};

describe("AIDiagnosticsPanel", () => {
  it("explains diagnostics in user-facing language", () => {
    render(
      <AIDiagnosticsPanel
        {...baseProps}
        diagnostics={{
          summary: {
            eventCount: 2,
            avgLatencyMs: 1057.1,
            avgSelectedCount: 8,
            fallbackCount: 0,
          },
          events: [],
        }}
        pipelineStatus={{ enabled: true, stages: [{ key: "retrieve" }] }}
      />,
    );

    expect(screen.getByText("AI Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("How the assistant finds context before answering.")).toBeInTheDocument();
    expect(screen.getByText("Retrieval pipeline")).toBeInTheDocument();
    expect(screen.getByText("Recent context lookups")).toBeInTheDocument();
    expect(screen.queryByText("AI Trace")).not.toBeInTheDocument();
  });

  it("groups generic schema chunks into understandable context chips", () => {
    render(
      <AIDiagnosticsPanel
        {...baseProps}
        diagnostics={{
          summary: {
            eventCount: 1,
            avgLatencyMs: 400,
            avgSelectedCount: 3,
            fallbackCount: 0,
          },
          events: [
            {
              id: "event-1",
              retrievalMode: "hybrid",
              selectedCount: 3,
              candidateCount: 8,
              latencyMs: 400,
              items: [
                { sourceType: "database_schema", title: "public schema", score: 0.032 },
                { sourceType: "database_schema", title: "public schema", score: 0.031 },
                { sourceType: "database_schema", title: "public schema", score: 0.03 },
              ],
            },
          ],
        }}
        pipelineStatus={{ enabled: true, stages: [] }}
      />,
    );

    expect(screen.getAllByText("Hybrid context search").length).toBeGreaterThan(0);
    expect(screen.getByText("Schema context")).toBeInTheDocument();
    expect(screen.getByText("x3")).toBeInTheDocument();
  });
});
