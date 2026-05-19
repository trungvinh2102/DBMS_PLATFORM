/**
 * @file use-ai-chat.test.ts
 * @description Regression tests for SQL Lab AI chat stream status handling.
 */

import { act, renderHook, waitFor } from "../test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { aiApi } from "@/lib/api-client";
import {
  getActiveAIConversationStorageKey,
  isLabeledThinkingEvent,
  isStatusThinkingEvent,
  stripInternalToolEnvelopes,
  useAIChat,
} from "@/app/sqllab/hooks/useAIChat";

describe("useAIChat stream status handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
});
