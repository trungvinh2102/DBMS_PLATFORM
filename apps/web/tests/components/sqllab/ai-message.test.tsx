/**
 * @file ai-message.test.tsx
 * @description Unit tests for the SQL Lab AI assistant message presentation and interactions.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIMessage } from "@/app/sqllab/components/ai/AIMessage";

describe("AIMessage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("clears the response copy reset timer when unmounted", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { unmount } = render(
      <AIMessage
        message={{
          id: "assistant-copy-unmount",
          role: "assistant",
          content: "Response to copy",
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy assistant response/i }));
    expect(screen.getByRole("button", { name: /response copied/i })).toBeInTheDocument();

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      vi.advanceTimersByTime(2001);
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("replaces SQL apply, preview, and diff actions with show data", () => {
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

    expect(screen.queryByRole("button", { name: /^apply$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^preview$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^diff$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hiển thị dữ liệu/i })).toBeInTheDocument();
  });

  it("renders queried SQL data inside the assistant message", async () => {
    const onShowSqlData = vi.fn().mockResolvedValue({
      columns: ["id", "name"],
      data: [{ id: 1, name: "Alice" }],
      executionTime: 12,
    });

    render(
      <AIMessage
        message={{
          id: "assistant-sql-preview",
          role: "assistant",
          content: "",
          sql: "SELECT * FROM users;",
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
        onShowSqlData={onShowSqlData}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /hiển thị dữ liệu/i }));

    expect(onShowSqlData).toHaveBeenCalledWith("SELECT * FROM users;");
    expect(await screen.findByText("Alice")).toBeInTheDocument();
  });

  it("reveals saved thinking activity even when the assistant message has SQL", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: /xem hoạt động trợ lý/i }));

    expect(screen.getByText("Initializing context...")).toBeInTheDocument();
  });

  it("keeps assistant activity hidden after the user hides it", async () => {
    render(
      <AIMessage
        message={{
          id: "assistant-hide-activity",
          role: "assistant",
          content: "",
          steps: [
            {
              type: "thinking",
              content: "Xác định yêu cầu của người dùng.",
              status: "complete",
            },
          ],
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /xem hoạt động trợ lý/i }));
    expect(screen.getByText("Xác định yêu cầu của người dùng.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ẩn hoạt động trợ lý/i }));

    expect(screen.getByRole("button", { name: /xem hoạt động trợ lý/i })).toBeInTheDocument();
    expect(screen.queryByText("Xác định yêu cầu của người dùng.")).not.toBeInTheDocument();
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

  it("renders assistant SQL in a plain code block without a loading fallback", () => {
    const { container } = render(
      <AIMessage
        message={{
          id: "assistant-plain-sql",
          role: "assistant",
          content: "",
          sql: "SELECT id, name FROM users;",
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    const code = container.querySelector("pre code");
    expect(code).toHaveTextContent("SELECT id, name FROM users;");
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
