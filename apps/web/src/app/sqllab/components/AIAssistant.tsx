/**
 * @file AIAssistantSidebar.tsx
 * @description AI coding assistant for SQL Lab, providing query generation, explanation, optimization, and bug fixing capabilities.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

import { aiApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useSQLLabContext } from "../context/SQLLabContext";
import { useAIChat } from "../hooks/useAIChat";
import { parseSlashCommand, filterCommands, type SlashCommand } from "../utils/slash-commands";

// Sub-components
import { ConversationHistory } from "./ai/ConversationHistory";
import { AIChatMessages } from "./ai/AIChatMessages";
import { AIChatInput, AUTO_MODEL_VALUE } from "./ai/AIChatInput";
import type { AIRuntimeStatus } from "./ai/types";

interface AIAssistantProps {
  showHistory: boolean;
  onShowHistoryChange: (show: boolean) => void;
  newChatSignal: number;
}

const shouldShowSlashCommands = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("/") && !trimmed.includes(" ");
};

const VIETNAMESE_RESPONSE_INSTRUCTION =
  "Hãy trả lời bằng tiếng Việt có dấu. Chỉ dùng ngôn ngữ khác khi người dùng yêu cầu rõ ràng; giữ nguyên SQL, tên bảng/cột và từ khóa kỹ thuật cần thiết.";

const buildVietnamesePrompt = (prompt: string) =>
  prompt.startsWith(VIETNAMESE_RESPONSE_INSTRUCTION)
    ? prompt
    : `${VIETNAMESE_RESPONSE_INSTRUCTION}\n\n${prompt}`;

export function AIAssistant({
  showHistory,
  onShowHistoryChange,
  newChatSignal,
}: AIAssistantProps) {
  const lab = useSQLLabContext();
  const selectedDatabaseId = lab.selectedDS || undefined;
  const selectedSchema = lab.selectedSchema;
  const selectedDatabaseType = lab.selectedDSType;
  const editorSql = lab.sql || "";
  const lastError = lab.error || undefined;
  const [input, setInput] = useState("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(AUTO_MODEL_VALUE);
  const [runtimeStatus, setRuntimeStatus] = useState<AIRuntimeStatus | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuIndex, setCommandMenuIndex] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const lastNewChatSignalRef = useRef(newChatSignal);

  const {
    messages,
    isTyping,
    handleSend: _handleSend,
    loadConversations,
    loadConversation,
    startNewChat,
    conversations,
    conversationId,
    addAssistantMessage,
    setIsTyping,
    isFetchingConversation,
    isLoadingConversations
  } = useAIChat(
    selectedDatabaseId,
    selectedSchema,
    selectedModel === AUTO_MODEL_VALUE ? undefined : selectedModel
  );

  // Initialize models and load logic
  useEffect(() => {
    const init = async () => {
      try {
        const [models, status] = await Promise.all([
          aiApi.getModels(),
          aiApi.getAIStatus(),
          loadConversations(selectedDatabaseId)
        ]);
        setAvailableModels(models || []);
        setRuntimeStatus(status);
        setSelectedModel((current) => current || AUTO_MODEL_VALUE);
        if (status && !status.hasApiKey) {
          toast.warning("AI provider key is not configured.");
        }
      } catch (e) {
        console.error("Failed to initialize AI assistant", e);
      }
    };
    init();
  }, [selectedDatabaseId, loadConversations]);

  // Virtualization
  const virtualizer = useVirtualizer({
    count: messages.length + (isTyping ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  // Auto-scroll logic
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, messages[messages.length - 1]?.content, isTyping, virtualizer]);

  useEffect(() => {
    if (lastNewChatSignalRef.current === newChatSignal) return;
    lastNewChatSignalRef.current = newChatSignal;
    startNewChat();
    onShowHistoryChange(false);
  }, [newChatSignal, onShowHistoryChange, startNewChat]);

  // Fix SQL Error handler
  useEffect(() => {
    if (lab.fixSQLError) {
      const errorMsg = lab.fixSQLError;
      lab.setFixSQLError(null);
      const prompt = buildVietnamesePrompt(`I'm getting this SQL error: "${errorMsg}".\n\nHere is my current SQL:\n\`\`\`sql\n${editorSql}\n\`\`\`\n\nPlease analyze and fix this query.`);
      startNewChat();
      onShowHistoryChange(false);
      setTimeout(() => _handleSend(prompt), 0);
    }
  }, [lab.fixSQLError, editorSql, _handleSend, lab.setFixSQLError, onShowHistoryChange, startNewChat]);

  const filteredCommandOptions = React.useMemo(
    () => (showCommandMenu ? filterCommands(input) : []),
    [input, showCommandMenu],
  );

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    const shouldShowCommands = shouldShowSlashCommands(value);
    setShowCommandMenu(shouldShowCommands);
    if (shouldShowCommands) setCommandMenuIndex(0);
  }, []);

  const handleSendRequest = useCallback(async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    setShowCommandMenu(false);

    const parsed = parseSlashCommand(currentInput);
    if (parsed) {
      const prompt = parsed.command.buildPrompt({
        editorSQL: editorSql,
        args: parsed.args,
        databaseType: selectedDatabaseType,
        schema: selectedSchema,
        lastError,
      });

      if (!prompt) {
        if (parsed.command.requiresEditorSQL && !editorSql.trim()) toast.error(`${parsed.command.command} requires SQL in the editor`);
        else if (parsed.command.acceptsArgs && !parsed.args) toast.error(`Usage: ${parsed.command.command} ${parsed.command.argsHint || '<args>'}`);
        return;
      }
      return _handleSend(buildVietnamesePrompt(prompt));
    }
    return _handleSend(currentInput);
  }, [input, editorSql, selectedDatabaseType, selectedSchema, lastError, _handleSend]);

  const handleCommandSelect = useCallback((cmd: SlashCommand) => {
    if (cmd.acceptsArgs) {
      setInput(cmd.command + " ");
      setShowCommandMenu(false);
    } else {
      setInput(cmd.command);
      setShowCommandMenu(false);
      setTimeout(async () => {
        const prompt = cmd.buildPrompt({
          editorSQL: editorSql,
          args: "",
          databaseType: selectedDatabaseType,
          schema: selectedSchema,
          lastError,
        });
        if (!prompt) {
          if (cmd.requiresEditorSQL && !editorSql.trim()) toast.error(`${cmd.command} requires SQL in the editor`);
          return;
        }
        setInput("");
        await _handleSend(buildVietnamesePrompt(prompt));
      }, 0);
    }
  }, [editorSql, selectedDatabaseType, selectedSchema, lastError, _handleSend]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showCommandMenu) {
      const filtered = filteredCommandOptions;
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCommandMenuIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCommandMenuIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
        e.preventDefault();
        const selected = filtered[commandMenuIndex];
        if (selected) handleCommandSelect(selected);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandMenu(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendRequest();
    }
  }, [commandMenuIndex, filteredCommandOptions, handleCommandSelect, handleSendRequest, showCommandMenu]);

  const handleExplain = useCallback(async (s: string) => {
    setIsTyping(true);
    try {
      const res = await aiApi.explainSQL({
        sql: s,
        modelId: selectedModel === AUTO_MODEL_VALUE ? undefined : selectedModel
      });
      addAssistantMessage(res.explanation);
    } finally { setIsTyping(false); }
  }, [selectedModel, addAssistantMessage, setIsTyping]);

  const handleOptimize = useCallback(async (s: string) => {
    setIsTyping(true);
    try {
      const res = await aiApi.optimizeSQL({
        sql: s,
        databaseId: selectedDatabaseId,
        schema: selectedSchema,
        modelId: selectedModel === AUTO_MODEL_VALUE ? undefined : selectedModel
      });
      addAssistantMessage("Đây là phiên bản đã tối ưu:", res.sql || res.result);
    } finally { setIsTyping(false); }
  }, [selectedDatabaseId, selectedSchema, selectedModel, addAssistantMessage, setIsTyping]);

  const handleSuggestionClick = useCallback((suggestion: string) => _handleSend(suggestion), [_handleSend]);

  const handleSelectConversation = useCallback((id: string) => {
    loadConversation(id);
    onShowHistoryChange(false);
  }, [loadConversation, onShowHistoryChange]);

  const handleRefreshConversations = useCallback(() => {
    loadConversations(selectedDatabaseId);
  }, [loadConversations, selectedDatabaseId]);

  const AIActions = React.useMemo(() => ({
    onExplain: handleExplain,
    onOptimize: handleOptimize,
    onSuggestionClick: handleSuggestionClick
  }), [handleExplain, handleOptimize, handleSuggestionClick]);

  if (!lab.showAISidebar) return null;

  return (
    <div
      className={cn(
        "h-full min-h-0 w-full overflow-hidden bg-background",
        showHistory
          ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]"
          : "flex",
      )}
    >
      <section className="flex min-h-0 min-w-0 flex-col w-full">
        {showHistory && (
          <div className="max-h-60 border-b border-border/70 bg-muted/15 md:hidden">
            <div className="flex h-10 items-center px-4 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
              Recent Conversations
            </div>
            <div className="max-h-48 overflow-y-auto overscroll-contain">
              <ConversationHistory
                conversations={conversations}
                currentId={conversationId}
                onSelect={handleSelectConversation}
                onRefresh={handleRefreshConversations}
                isLoading={isLoadingConversations}
              />
            </div>
          </div>
        )}

        <AIChatMessages
          messages={messages}
          isTyping={isTyping}
          isFetchingConversation={isFetchingConversation}
          virtualizer={virtualizer}
          parentRef={parentRef}
          conversationId={conversationId}
          {...AIActions}
        />

        <AIChatInput
          input={input}
          onInputChange={handleInputChange}
          onKeyDown={onKeyDown}
          isTyping={isTyping}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableModels={availableModels}
          runtimeStatus={runtimeStatus}
          onSend={handleSendRequest}
          showCommandMenu={showCommandMenu}
          commandMenuIndex={commandMenuIndex}
          commandOptions={filteredCommandOptions}
          onCommandSelect={handleCommandSelect}
        />
      </section>

      {showHistory && (
        <aside className="hidden h-full min-h-0 min-w-0 shrink-0 overflow-hidden border-l border-border/70 bg-muted/15 md:flex md:flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Conversations
              </p>
              <p className="truncate text-[11px] text-muted-foreground/70">
                Recent AI sessions
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ConversationHistory
              conversations={conversations}
              currentId={conversationId}
              onSelect={handleSelectConversation}
              onRefresh={handleRefreshConversations}
              isLoading={isLoadingConversations}
            />
          </div>
        </aside>
      )}
    </div>
  );
}
