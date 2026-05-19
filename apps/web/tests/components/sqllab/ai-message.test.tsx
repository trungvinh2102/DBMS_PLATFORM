/**
 * @file ai-message.test.tsx
 * @description Unit tests for the SQL Lab AI assistant message presentation and interactions.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AIMessage } from "@/app/sqllab/components/ai/AIMessage";

describe("AIMessage", () => {
  it("renders streamed SQL markdown immediately without a blank placeholder", () => {
    render(
      <AIMessage
        message={{
          id: "assistant-streaming",
          role: "assistant",
          content: "```sql\nSELECT * FROM users",
          isStreaming: true,
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    expect(screen.getByText(/SELECT \* FROM users/i)).toBeInTheDocument();
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
  });

  it("copies the assistant response content", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <AIMessage
        message={{
          id: "assistant-1",
          role: "assistant",
          content: "Use an indexed lookup for this query.",
          explanation: "The indexed path should reduce table scans.",
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    expect(await screen.findByText("Use an indexed lookup for this query.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /copy assistant response/i }));

    expect(writeText).toHaveBeenCalledWith(
      "Use an indexed lookup for this query.\n\nThe indexed path should reduce table scans.",
    );
    expect(screen.getByRole("button", { name: /response copied/i })).toBeInTheDocument();
  });

  it("does not render an apply-to-editor action for assistant SQL", () => {
    render(
      <AIMessage
        message={{
          id: "assistant-sql",
          role: "assistant",
          content: "",
          sql: "SELECT 1;",
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /apply to editor/i })).not.toBeInTheDocument();
  });

  it("shows saved thinking activity even when the assistant message has SQL", () => {
    render(
      <AIMessage
        message={{
          id: "assistant-sql-thinking",
          role: "assistant",
          content: "",
          sql: "SELECT 1;",
          steps: [
            {
              type: "thinking",
              content: "Initializing context...",
              status: "complete",
            },
          ],
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    expect(screen.getByText("Initializing context...")).toBeInTheDocument();
  });

  it("does not show confidence metadata after the assistant finishes", () => {
    render(
      <AIMessage
        message={{
          id: "assistant-complete-confidence",
          role: "assistant",
          content: "The query is ready.",
          confidence: 1,
          isStreaming: false,
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    expect(screen.getByText("The query is ready.")).toBeInTheDocument();
    expect(screen.queryByText(/20% Confidence/i)).not.toBeInTheDocument();
  });
});
