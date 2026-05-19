/**
 * @file use-ai-chat.test.ts
 * @description Regression tests for SQL Lab AI chat stream status handling.
 */

import { act, renderHook, waitFor } from "../test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aiApi } from "@/lib/api-client";
import {
  getActiveAIConversationStorageKey,
  isLabeledThinkingEvent,
  isStatusThinkingEvent,
  stripInternalToolEnvelopes,
  stripThinkingLabel,
  useAIChat,
} from "@/app/sqllab/hooks/useAIChat";

describe("useAIChat stream status handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recognizes localized startup statuses so they render as separate activity steps", () => {
    expect(isStatusThinkingEvent("Đang khởi tạo bối cảnh...")).toBe(true);
    expect(isStatusThinkingEvent("Phân tích lược đồ...")).toBe(true);
  });

  it("does not classify model reasoning as a status event", () => {
    expect(isStatusThinkingEvent("I will inspect tables before writing SQL.")).toBe(false);
  });

  it("recognizes ready statuses so following reasoning does not merge into them", () => {
    expect(isStatusThinkingEvent("Sẵn sàng.")).toBe(true);
    expect(isStatusThinkingEvent("Intent: Xác định người dùng sử dụng từ ngữ nhạy cảm.")).toBe(false);
  });

  it("recognizes labeled thinking events as separate stream steps", () => {
    expect(isLabeledThinkingEvent("Intent: Xác định người dùng sử dụng từ ngữ nhạy cảm.")).toBe(true);
    expect(isLabeledThinkingEvent("Schema mapping: use voice_message_meta.transcription.")).toBe(true);
    expect(isLabeledThinkingEvent("Strategy: scan transcripts with a keyword filter.")).toBe(true);
    expect(isLabeledThinkingEvent("Continue the previous sentence.")).toBe(false);
  });

  it("removes thinking labels from assistant-visible activity", () => {
    expect(stripThinkingLabel("Intent: Xác định người dùng có thể đã sử dụng từ ngữ nhạy cảm.")).toBe(
      "Xác định người dùng có thể đã sử dụng từ ngữ nhạy cảm.",
    );
    expect(stripThinkingLabel("Schema mapping: use voice_message_meta.transcription.")).toBe(
      "use voice_message_meta.transcription.",
    );
  });

  it("strips internal tool JSON envelopes from assistant-visible content", () => {
    const content = [
      '{"name": "SchemaContextLoader", "args": {"databaseId": "db-1", "intent": "Xin chào"}}',
      '{"name": "RetrievalTrace", "args": {"intent": "Xin chào", "tables": []}}',
      "Xin chào! Tôi là QurioDB copilot.",
    ].join("\n");

    expect(stripInternalToolEnvelopes(content)).toBe("Xin chào! Tôi là QurioDB copilot.");
  });

  it("restores the active conversation after the assistant remounts", async () => {
    window.localStorage.setItem(getActiveAIConversationStorageKey("db-1"), "conv-1");
    const getConversationMessages = vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({
      id: "conv-1",
      messages: [{ id: "msg-1", role: "user", content: "SELECT 1;" }],
    });

    const { result } = renderHook(() => useAIChat("db-1", "public"));

    await waitFor(() => {
      expect(result.current.conversationId).toBe("conv-1");
    });
    expect(getConversationMessages).toHaveBeenCalledWith("conv-1");
    expect(result.current.messages).toEqual([
      {
        id: "msg-1",
        role: "user",
        content: "SELECT 1;",
        isActionable: false,
      },
    ]);
  });

  it("stores loaded conversations and clears them when starting a new chat", async () => {
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({
      id: "conv-2",
      messages: [],
    });

    const { result } = renderHook(() => useAIChat("db-1", "public"));

    await act(async () => {
      await result.current.loadConversation("conv-2");
    });

    expect(window.localStorage.getItem(getActiveAIConversationStorageKey("db-1"))).toBe("conv-2");

    act(() => {
      result.current.startNewChat();
    });

    expect(window.localStorage.getItem(getActiveAIConversationStorageKey("db-1"))).toBeNull();
    expect(result.current.conversationId).toBeNull();
  });

  it("keeps final streamed assistant content when chunks are frame-batched", async () => {
    vi.spyOn(aiApi, "getConversations").mockResolvedValue([]);
    vi.spyOn(aiApi, "streamChat").mockImplementation(async (_data, onChunk, onHeaders) => {
      onHeaders?.(new Headers({ "X-Conversation-Id": "conv-stream" }));
      onChunk("SELECT", "message");
      onChunk(" 1;", "message");
    });

    const { result } = renderHook(() => useAIChat("db-1", "public"));

    await act(async () => {
      await result.current.handleSend("make a test query");
    });

    await waitFor(() => {
      expect(result.current.messages.at(-1)).toEqual(
        expect.objectContaining({
          role: "assistant",
          content: "SELECT 1;",
          isStreaming: false,
        }),
      );
    });
    expect(result.current.conversationId).toBe("conv-stream");
  });

  it("strips labels from streamed thinking steps", async () => {
    vi.spyOn(aiApi, "getConversations").mockResolvedValue([]);
    vi.spyOn(aiApi, "streamChat").mockImplementation(async (_data, onChunk, onHeaders) => {
      onHeaders?.(new Headers({ "X-Conversation-Id": "conv-thinking" }));
      onChunk("Intent: Xác định người dùng có thể đã sử dụng từ ngữ nhạy cảm.", "thinking");
      onChunk("Schema mapping: use voice_message_meta.transcription.", "thinking");
    });

    const { result } = renderHook(() => useAIChat("db-1", "public"));

    await act(async () => {
      await result.current.handleSend("kiểm tra từ ngữ nhạy cảm");
    });

    await waitFor(() => {
      expect(result.current.messages.at(-1)?.steps).toEqual([
        expect.objectContaining({
          content: "Xác định người dùng có thể đã sử dụng từ ngữ nhạy cảm.",
        }),
        expect.objectContaining({
          content: "use voice_message_meta.transcription.",
        }),
      ]);
    });
  });
});
