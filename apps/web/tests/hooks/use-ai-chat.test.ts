/**
 * @file use-ai-chat.test.ts
 * @description Regression tests for SQL Lab AI chat stream status handling.
 */

import { describe, expect, it } from "vitest";

import { isLabeledThinkingEvent, isStatusThinkingEvent, stripInternalToolEnvelopes } from "@/app/sqllab/hooks/useAIChat";

describe("useAIChat stream status handling", () => {
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
});
