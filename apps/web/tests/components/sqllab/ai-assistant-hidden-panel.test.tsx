/**
 * @file ai-assistant-hidden-panel.test.tsx
 * @description Hidden AI panel behavior: while `active=false` the message list
 * is not rendered, but the streaming conversation continues in the background
 * with correct ordering, no lost chunks, and no duplicate messages once the
 * panel becomes visible again.
 *
 * jsdom has no layout engine, so the virtualized message list needs bounded
 * layout numbers (same approach as the AIChatMessages performance suite).
 */

import { act, fireEvent, render, screen, waitFor } from "../../test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIAssistant, type AIAssistantLab } from "@/app/sqllab/components/AIAssistant";
import { aiApi } from "@/lib/api-client";

const lab = (overrides: Partial<AIAssistantLab> = {}): AIAssistantLab => ({
  selectedDS: "db-1",
  selectedSchema: "public",
  selectedDSType: "postgresql",
  sql: "SELECT 1;",
  error: null,
  fixSQLError: null,
  queryLimit: 500,
  setFixSQLError: vi.fn(),
  ...overrides,
});

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  lab: lab(),
  active: true,
  showHistory: false,
  onShowHistoryChange: vi.fn(),
  newChatSignal: 0,
  ...overrides,
});

describe("AIAssistant hidden-panel streaming behavior", () => {
  let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute("data-index")) return 160;
        return 600;
      });
    vi.spyOn(aiApi, "getModels").mockResolvedValue([]);
    vi.spyOn(aiApi, "getAIStatus").mockResolvedValue({
      langchain: true,
      langgraph: true,
      langsmith: false,
      hasApiKey: true,
      tracingEnabled: false,
    });
    vi.spyOn(aiApi, "getRagPipelineStatus").mockResolvedValue(null);
    vi.spyOn(aiApi, "getConversations").mockResolvedValue([]);
  });

  afterEach(() => {
    offsetHeightSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("keeps stream state and ordering consistent while the panel is hidden", async () => {
    let resolveStream!: () => void;
    let emitChunk!: (chunk: string, event?: string) => void;
    vi.spyOn(aiApi, "streamChat").mockImplementation((_data, onChunk) => {
      emitChunk = onChunk;
      return new Promise<void>((resolve) => {
        resolveStream = () => resolve();
      });
    });

    const props = baseProps();
    const { rerender, container } = render(<AIAssistant {...props} />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/describe the query/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/describe the query/i), {
      target: { value: "hidden stream" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    // The user message renders while the stream is pending.
    await waitFor(() => expect(screen.getByText(/hidden stream/)).toBeInTheDocument());

    // Hide the panel mid-stream: the message list must not render.
    rerender(<AIAssistant {...props} active={false} />);
    expect(container).toBeEmptyDOMElement();

    // Chunks continue to arrive and accumulate in order while hidden.
    await act(async () => {
      emitChunk("Phần ", "message");
    });
    await act(async () => {
      emitChunk("một", "message");
    });
    await act(async () => {
      emitChunk("SELECT 42;", "sql");
    });
    await act(async () => {
      emitChunk("Giải thích.", "analysis");
    });

    // Complete the stream while the panel is still hidden.
    await act(async () => {
      resolveStream();
    });

    // Re-open the panel: the full streamed answer renders exactly once.
    rerender(<AIAssistant {...props} active={true} />);

    expect(await screen.findByText("Phần một")).toBeInTheDocument();
    expect(screen.queryAllByText("Phần một")).toHaveLength(1);
    expect(screen.getByText(/SELECT 42;/)).toBeInTheDocument();
    expect(screen.getByText("Giải thích.")).toBeInTheDocument();

    // The completed assistant message is not still streaming.
    expect(screen.queryByText(/Đang kết nối trợ lý/i)).not.toBeInTheDocument();
  });

  it("does not duplicate the streamed message when the panel is hidden and re-opened", async () => {
    let resolveStream!: () => void;
    let emitChunk!: (chunk: string, event?: string) => void;
    vi.spyOn(aiApi, "streamChat").mockImplementation((_data, onChunk) => {
      emitChunk = onChunk;
      return new Promise<void>((resolve) => {
        resolveStream = () => resolve();
      });
    });

    const props = baseProps();
    const { rerender, container } = render(<AIAssistant {...props} />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/describe the query/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/describe the query/i), {
      target: { value: "no duplicates" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/no duplicates/)).toBeInTheDocument());

    rerender(<AIAssistant {...props} active={false} />);
    expect(container).toBeEmptyDOMElement();

    await act(async () => {
      emitChunk("only once", "message");
      resolveStream();
    });

    rerender(<AIAssistant {...props} active={true} />);

    expect(await screen.findByText("only once")).toBeInTheDocument();
    expect(screen.queryAllByText("only once")).toHaveLength(1);
    // User message plus a single assistant message.
    expect(screen.queryAllByText(/no duplicates/)).toHaveLength(1);
  });

  it("shows the same messages when hidden and re-opened with a multi-chunk stream", async () => {
    let resolveStream!: () => void;
    let emitChunk!: (chunk: string, event?: string) => void;
    vi.spyOn(aiApi, "streamChat").mockImplementation((_data, onChunk) => {
      emitChunk = onChunk;
      return new Promise<void>((resolve) => {
        resolveStream = () => resolve();
      });
    });

    const props = baseProps();
    const { rerender, container } = render(<AIAssistant {...props} />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/describe the query/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByPlaceholderText(/describe the query/i), {
      target: { value: "multi chunk" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/multi chunk/)).toBeInTheDocument());

    // Hide the panel before any content chunk arrives.
    rerender(<AIAssistant {...props} active={false} />);
    expect(container).toBeEmptyDOMElement();

    for (let i = 0; i < 30; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        emitChunk(`chunk-${i} `, "message");
      });
    }
    await act(async () => {
      resolveStream();
    });

    rerender(<AIAssistant {...props} active={true} />);

    const fullText = Array.from({ length: 30 }, (_, i) => `chunk-${i} `).join("").trim();
    expect(await screen.findByText(fullText)).toBeInTheDocument();
    expect(screen.queryAllByText(fullText)).toHaveLength(1);
  });
});
