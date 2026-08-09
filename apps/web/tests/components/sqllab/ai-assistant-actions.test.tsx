/**
 * @file ai-assistant-actions.test.tsx
 * @description Regression coverage for SQL Assistant Explain and Optimize actions.
 */

import { fireEvent, render, screen, waitFor } from "../../test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIAssistant, type AIAssistantLab } from "@/app/sqllab/components/AIAssistant";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useAIChat } from "@/app/sqllab/hooks/useAIChat";

vi.mock("@/app/sqllab/hooks/useAIChat", () => ({
  useAIChat: vi.fn(),
}));

const mockedUseAIChat = vi.mocked(useAIChat);

const lab = (overrides: Partial<AIAssistantLab> = {}): AIAssistantLab => ({
  selectedDS: "db-1",
  selectedSchema: "analytics",
  selectedDSType: "postgresql",
  sql: "SELECT * FROM users;",
  error: null,
  fixSQLError: null,
  queryLimit: 500,
  setFixSQLError: vi.fn(),
  ...overrides,
});

const baseProps = (overrides: Partial<Parameters<typeof AIAssistant>[0]> = {}) => ({
  lab: lab(),
  active: true,
  showHistory: false,
  onShowHistoryChange: vi.fn(),
  newChatSignal: 0,
  ...overrides,
});

describe("AIAssistant Explain and Optimize actions", () => {
  const addAssistantMessage = vi.fn();
  const setIsTyping = vi.fn();
  const handleActionStream = vi.fn();
  let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    handleActionStream.mockReset();
    vi.spyOn(toast, "error").mockImplementation(() => "toast-id");
    offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute("data-index")) return 160;
        return 600;
      });
    mockedUseAIChat.mockReturnValue({
      messages: [{ id: "sql-1", role: "assistant", content: "", sql: "SELECT * FROM users;" }],
      setMessages: vi.fn(),
      streamingMessage: null,
      isTyping: false,
      handleSend: vi.fn(),
      handleActionStream,
      loadHistory: vi.fn(),
      loadConversations: vi.fn(),
      loadConversation: vi.fn(),
      startNewChat: vi.fn(),
      conversations: [],
      conversationId: null,
      addAssistantMessage,
      setIsTyping,
      isFetchingConversation: false,
      isLoadingConversations: false,
    });
    vi.spyOn(aiApi, "getModels").mockResolvedValue([]);
    vi.spyOn(aiApi, "getAIStatus").mockResolvedValue({ hasApiKey: true } as never);
    vi.spyOn(aiApi, "getRagPipelineStatus").mockResolvedValue(null);
    vi.spyOn(aiApi, "getConversations").mockResolvedValue([]);
  });

  afterEach(() => {
    offsetHeightSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("routes Explain through the action stream with the active conversation and model", async () => {
    mockedUseAIChat.mockReturnValue({
      ...mockedUseAIChat.mock.results[0]?.value,
      messages: [{ id: "sql-1", role: "assistant", content: "", sql: "SELECT * FROM users;" }],
      conversationId: "conv-1",
      handleActionStream,
      addAssistantMessage,
      setIsTyping,
      loadConversations: vi.fn(),
      loadConversation: vi.fn(),
      startNewChat: vi.fn(),
      conversations: [],
      setMessages: vi.fn(),
      streamingMessage: null,
      isTyping: false,
      handleSend: vi.fn(),
      isFetchingConversation: false,
      isLoadingConversations: false,
    });
    render(<AIAssistant {...baseProps()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Explain" }));

    await waitFor(() => expect(handleActionStream).toHaveBeenCalledWith("explain", "SELECT * FROM users;", {
      databaseId: "db-1",
      schema_name: "analytics",
      modelId: undefined,
    }));
  });

  it("routes Optimize through the action stream with database context", async () => {
    render(<AIAssistant {...baseProps()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Optimize" }));

    await waitFor(() => expect(handleActionStream).toHaveBeenCalledWith("optimize", "SELECT * FROM users;", {
      databaseId: "db-1",
      schema_name: "analytics",
      modelId: undefined,
    }));
  });

  it("does not call Optimize without a selected database", async () => {
    render(<AIAssistant {...baseProps({ lab: lab({ selectedDS: "" }) })} />);

    fireEvent.click(await screen.findByRole("button", { name: "Optimize" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Chọn database trước khi tối ưu SQL."));
    expect(handleActionStream).not.toHaveBeenCalled();
  });

  it.each([
    ["Explain", "Explain failed", "Explain failed"],
    ["Optimize", null, "Không thể tối ưu SQL."],
  ])("preserves the safe error toast for %s", async (label, rejection, expectedMessage) => {
    handleActionStream.mockRejectedValue(rejection);
    render(<AIAssistant {...baseProps()} />);

    fireEvent.click(await screen.findByRole("button", { name: label }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expectedMessage));
  });
});
