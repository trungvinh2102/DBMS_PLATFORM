/**
 * @file ai-action-streaming.test.tsx
 * @description Regression coverage for Explain/Optimize action stream lifecycle.
 */

import { act, renderHook, waitFor } from "../../test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aiApi } from "@/lib/api-client";
import { useAIChat } from "@/app/sqllab/hooks/useAIChat";
import { useAuth } from "@/hooks/use-auth";
import { clearDesktopApiConfiguration, configureDesktopApi } from "@/lib/runtime-api";
import { toast } from "sonner";

describe("useAIChat action streaming", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(aiApi, "getConversations").mockResolvedValue([]);
  });

  afterEach(() => {
    clearDesktopApiConfiguration();
    delete window.__TAURI_INTERNALS__;
    useAuth.setState({ token: null });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["explain", "ai/explain-sql/stream"],
    ["optimize", "ai/optimize-sql/stream"],
  ] as const)("streamAction sends %s to its streaming endpoint and parses SSE frames", async (action, endpoint) => {
    window.__TAURI_INTERNALS__ = {};
    configureDesktopApi("http://127.0.0.1:43123/api/");
    useAuth.setState({ token: "test-token" });

    const streamChunks = [
      new TextEncoder().encode('event: thinking\ndata: "first"\n\n'),
      new TextEncoder().encode('event: message\ndata: "second"\n\n'),
      new TextEncoder().encode("data: [DONE]\n\n"),
    ];
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: streamChunks[0] })
        .mockResolvedValueOnce({ done: false, value: streamChunks[1] })
        .mockResolvedValueOnce({ done: false, value: streamChunks[2] })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Conversation-Id": "conv-stream" }),
      body: { getReader: () => reader },
    });
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;
    const chunks: Array<[unknown, string | undefined]> = [];
    const headers = vi.fn();

    await aiApi.streamAction(action, {
      sql: "SELECT 1;",
      databaseId: "db-1",
      schema_name: "analytics",
      modelId: "model-1",
      conversationId: "conv-stream",
    }, (chunk, event) => chunks.push([chunk, event]), headers, signal);

    expect(fetchMock).toHaveBeenCalledWith(`http://127.0.0.1:43123/api/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
        "X-App-Platform": "tauri",
      },
      credentials: "include",
      body: JSON.stringify({
        sql: "SELECT 1;",
        databaseId: "db-1",
        schema_name: "analytics",
        modelId: "model-1",
        conversationId: "conv-stream",
      }),
      signal,
    });
    expect(headers).toHaveBeenCalledWith(expect.any(Headers));
    expect(chunks).toEqual([["first", "thinking"], ["second", "message"]]);
    expect(reader.read).toHaveBeenCalledTimes(4);
  });

  it("renders the action turn incrementally and commits one assistant message", async () => {
    const snapshots: Array<{ id: string; content: string; isStreaming?: boolean }> = [];
    let releaseSecondChunk: (() => void) | undefined;
    let releaseCompletion: (() => void) | undefined;
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({ id: "conv-current", messages: [] });
    vi.spyOn(aiApi, "streamAction").mockImplementation(async (_action, _data, onChunk, onHeaders) => {
      onHeaders?.(new Headers({ "X-Conversation-Id": "conv-current" }));
      onChunk("first", "message");
      await new Promise<void>((resolve) => {
        releaseSecondChunk = resolve;
      });
      onChunk(" second", "message");
      await new Promise<void>((resolve) => {
        releaseCompletion = resolve;
      });
    });

    const { result } = renderHook(() => {
      const state = useAIChat("db-1", "analytics", "model-1");
      if (state.streamingMessage) {
        snapshots.push({
          id: state.streamingMessage.id,
          content: state.streamingMessage.content,
          isStreaming: state.streamingMessage.isStreaming,
        });
      }
      return state;
    });

    await act(async () => {
      await result.current.loadConversation("conv-current");
    });
    let actionPromise: Promise<void> = Promise.resolve();
    act(() => {
      actionPromise = result.current.handleActionStream("explain", "SELECT 1;", {
        databaseId: "db-1",
        schema_name: "analytics",
        modelId: "model-1",
      });
    });

    await waitFor(() => expect(snapshots.length).toBeGreaterThanOrEqual(1));
    expect(snapshots[0].isStreaming).toBe(true);
    releaseSecondChunk?.();
    await waitFor(() => expect(snapshots.length).toBeGreaterThanOrEqual(2));
    releaseCompletion?.();
    await act(async () => {
      await actionPromise;
    });

    expect(result.current.messages).toEqual([
       expect.objectContaining({
         role: "user",
         action: "explain",
         content: "Explain SQL:\n\n```sql\nSELECT 1;\n```",
       }),
      expect.objectContaining({ role: "assistant", content: "first second", isStreaming: false }),
    ]);
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    expect(new Set(snapshots.map((snapshot) => snapshot.id)).size).toBe(1);
    expect(result.current.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
  });

  it("sends the active conversation and action context", async () => {
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({ id: "conv-current", messages: [] });
    const streamAction = vi.spyOn(aiApi, "streamAction").mockResolvedValue();
    const { result } = renderHook(() => useAIChat("db-1", "analytics", "model-1"));

    await act(async () => {
      await result.current.loadConversation("conv-current");
      await result.current.handleActionStream("optimize", "SELECT 1;", {
        databaseId: "db-1",
        schema_name: "analytics",
        modelId: "model-1",
      });
    });

    expect(streamAction).toHaveBeenCalledWith(
      "optimize",
      expect.objectContaining({
        sql: "SELECT 1;",
        conversationId: "conv-current",
        databaseId: "db-1",
        schema_name: "analytics",
        modelId: "model-1",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it("allows Explain without a hook database and aborts its deferred fetch reader", async () => {
    window.__TAURI_INTERNALS__ = {};
    configureDesktopApi("http://127.0.0.1:43123/api/");
    useAuth.setState({ token: "test-token" });

    let rejectRead: ((reason?: unknown) => void) | undefined;
    const reader = {
      read: vi.fn(() => new Promise<never>((_, reject) => {
        rejectRead = reject;
      })),
      cancel: vi.fn(async () => {
        rejectRead?.(new DOMException("The stream was cancelled", "AbortError"));
      }),
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Conversation-Id": "conv-explain" }),
      body: { getReader: () => reader },
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAIChat());
    let actionPromise: Promise<void> = Promise.resolve();
    act(() => {
      actionPromise = result.current.handleActionStream("explain", "SELECT 1;");
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.conversationId).toBe("conv-explain"));
    expect(window.localStorage.getItem("sqllab_ai_active_conversation:global")).toBe("conv-explain");
    await waitFor(() => expect(result.current.isTyping).toBe(true));

    act(() => result.current.startNewChat());
    await act(async () => {
      await actionPromise;
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.signal?.aborted).toBe(true);
    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toEqual([]);
    expect(result.current.isTyping).toBe(false);
  });

  it("does not show a database toast when Explain has no database", async () => {
    const toastError = vi.spyOn(toast, "error");
    const streamAction = vi.spyOn(aiApi, "streamAction").mockResolvedValue();
    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.handleActionStream("explain", "SELECT 1;");
    });

    expect(streamAction).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("does not stream Optimize or normal Send without a database", async () => {
    const toastError = vi.spyOn(toast, "error");
    const streamAction = vi.spyOn(aiApi, "streamAction").mockResolvedValue();
    const streamChat = vi.spyOn(aiApi, "streamChat").mockResolvedValue();
    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.handleActionStream("optimize", "SELECT 1;");
      await result.current.handleSend("Show me the data");
    });

    expect(streamAction).not.toHaveBeenCalled();
    expect(streamChat).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(2);
    expect(toastError).toHaveBeenNthCalledWith(1, "Connect a database first.");
    expect(toastError).toHaveBeenNthCalledWith(2, "Connect a database first.");
  });

  it("does not restore a conversation response after switching databases", async () => {
    let resolveOldLoad: ((response: { id: string; messages: any[] }) => void) | undefined;
    const getConversationMessages = vi.spyOn(aiApi, "getConversationMessages").mockImplementation(
      () => new Promise((resolve) => {
        resolveOldLoad = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ databaseId }: { databaseId?: string }) => useAIChat(databaseId),
      { initialProps: { databaseId: "db-old" } },
    );

    let oldLoad: Promise<void> = Promise.resolve();
    act(() => {
      oldLoad = result.current.loadConversation("conv-old");
    });
    await waitFor(() => expect(getConversationMessages).toHaveBeenCalledWith("conv-old"));

    rerender({ databaseId: "db-new" });
    resolveOldLoad?.({
      id: "conv-old",
      messages: [{ id: "message-old", role: "user", content: "old database" }],
    });
    await act(async () => {
      await oldLoad;
    });

    expect(result.current.conversationId).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(window.localStorage.getItem("sqllab_ai_active_conversation:db-old")).toBeNull();
  });

  it.each([null, undefined, new Error("stream failed"), "stream failed"])(
    "renders a visible error and does not append success for rejection %p",
    async (rejection) => {
      vi.spyOn(aiApi, "streamAction").mockRejectedValue(rejection);
      const { result } = renderHook(() => useAIChat("db-1", "analytics"));

      await act(async () => {
        await result.current.handleActionStream("explain", "SELECT 1;");
      });

      await waitFor(() => expect(result.current.messages.at(-1)).toEqual(
        expect.objectContaining({
          role: "assistant",
          content: expect.stringContaining("Error:"),
          isStreaming: false,
          isActionable: false,
        }),
      ));
      expect(result.current.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
    },
  );

  it("renders SSE errors without appending later success chunks", async () => {
    vi.spyOn(aiApi, "streamAction").mockImplementation(async (_action, _data, onChunk) => {
      onChunk("backend failed", "error");
      onChunk("should not render", "message");
    });
    const { result } = renderHook(() => useAIChat("db-1", "analytics"));

    await act(async () => {
      await result.current.handleActionStream("explain", "SELECT 1;");
    });

    expect(result.current.messages.at(-1)).toEqual(expect.objectContaining({
      content: "Error: backend failed",
      isStreaming: false,
      isActionable: false,
    }));
  });

  it("keeps an SSE error after the stream completes following its error flush", async () => {
    vi.spyOn(aiApi, "streamAction").mockImplementation(async (_action, _data, onChunk) => {
      onChunk("backend failed", "error");
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });
    const { result } = renderHook(() => useAIChat("db-1", "analytics"));

    await act(async () => {
      await result.current.handleActionStream("explain", "SELECT 1;");
    });

    expect(result.current.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
    expect(result.current.messages.at(-1)).toEqual(expect.objectContaining({
      content: "Error: backend failed",
      isStreaming: false,
      isActionable: false,
    }));
  });

  it("ignores chunks from an invalidated action stream", async () => {
    let emitOldChunk: ((chunk: string, event?: string) => void) | undefined;
    let resolveOldStream: (() => void) | undefined;
    vi.spyOn(aiApi, "streamAction").mockImplementation((_action, _data, onChunk) => {
      emitOldChunk = onChunk;
      return new Promise<void>((resolve) => {
        resolveOldStream = resolve;
      });
    });

    const { result } = renderHook(() => useAIChat("db-1", "analytics"));
    let oldStream: Promise<void> = Promise.resolve();
    act(() => {
      oldStream = result.current.handleActionStream("explain", "old");
    });
    await waitFor(() => expect(result.current.streamingMessage).toBeTruthy());

    act(() => result.current.startNewChat());
    emitOldChunk?.("stale", "message");
    resolveOldStream?.();
    await act(async () => {
      await oldStream;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.streamingMessage).toBeNull();
  });

  it("invalidates an action stream and clears its conversation when the database changes", async () => {
    let emitOldChunk: ((chunk: string, event?: string) => void) | undefined;
    let emitOldHeaders: ((headers: Headers) => void) | undefined;
    let resolveOldStream: (() => void) | undefined;
    const streamAction = vi.spyOn(aiApi, "streamAction").mockImplementationOnce((_action, _data, onChunk, onHeaders) => {
      emitOldChunk = onChunk;
      emitOldHeaders = onHeaders;
      return new Promise<void>((resolve) => {
        resolveOldStream = resolve;
      });
    }).mockResolvedValue();
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({ id: "conv-old", messages: [] });

    const { result, rerender } = renderHook(
      ({ databaseId }: { databaseId?: string }) => useAIChat(databaseId, "analytics", "model-1"),
      { initialProps: { databaseId: "db-old" } },
    );

    await act(async () => {
      await result.current.loadConversation("conv-old");
    });
    let oldStream: Promise<void> = Promise.resolve();
    act(() => {
      oldStream = result.current.handleActionStream("explain", "SELECT old;");
    });
    await waitFor(() => expect(result.current.streamingMessage).toBeTruthy());

    rerender({ databaseId: "db-new" });
    emitOldHeaders?.(new Headers({ "X-Conversation-Id": "conv-old-late" }));
    emitOldChunk?.("stale", "message");
    resolveOldStream?.();
    await act(async () => {
      await oldStream;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.streamingMessage).toBeNull();
    await act(async () => {
      await result.current.handleActionStream("explain", "SELECT new;");
    });

    expect(streamAction).toHaveBeenLastCalledWith(
      "explain",
      expect.objectContaining({
        sql: "SELECT new;",
        databaseId: "db-new",
        conversationId: undefined,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });
});
