/**
 * @file AIAssistantSidebar.tsx
 * @description AI coding assistant for SQL Lab, providing query generation, explanation, optimization, and bug fixing capabilities.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

import { aiApi } from "@/lib/api-client";
import { useSQLLabContext } from "../context/SQLLabContext";
import { useAIChat } from "../hooks/useAIChat";
import { parseSlashCommand, filterCommands, type SlashCommand } from "../utils/slash-commands";

// Sub-components
import { ConversationHistory } from "./ai/ConversationHistory";
import { AIAssistantHeader } from "./ai/AIAssistantHeader";
import { AIChatMessages } from "./ai/AIChatMessages";
import { AIChatInput } from "./ai/AIChatInput";

export function AIAssistantSidebar() {
  const lab = useSQLLabContext();
  const [input, setInput] = useState("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandMenuIndex, setCommandMenuIndex] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

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
  } = useAIChat(lab.selectedDS || undefined, lab.selectedSchema, selectedModel);

  // Initialize models and load logic
  useEffect(() => {
    const init = async () => {
      try {
        const [models] = await Promise.all([
          aiApi.getModels(),
          loadConversations(lab.selectedDS || undefined)
        ]);
        setAvailableModels(models);
        if (models?.length > 0) setSelectedModel(models[0].modelId);
      } catch (e) {
        console.error("Failed to initialize AI assistant", e);
      }
    };
    init();
  }, [lab.selectedDS, loadConversations]);

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

  // Fix SQL Error handler
  useEffect(() => {
    if (lab.fixSQLError) {
      const errorMsg = lab.fixSQLError;
      const currentSql = lab.sql;
      lab.setFixSQLError(null);
      const prompt = `I'm getting this SQL error: "${errorMsg}".\n\nHere is my current SQL:\n\`\`\`sql\n${currentSql}\n\`\`\`\n\nPlease analyze and fix this query.`;
      startNewChat();
      setShowHistory(false);
      setTimeout(() => _handleSend(prompt), 0);
    }
  }, [lab.fixSQLError, lab.sql, _handleSend, lab.setFixSQLError, startNewChat]);

  // Command visibility
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.startsWith("/") && !trimmed.includes(" ")) {
      setShowCommandMenu(true);
      setCommandMenuIndex(0);
    } else {
      setShowCommandMenu(false);
    }
  }, [input]);

  const handleSendRequest = useCallback(async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    setShowCommandMenu(false);

    const parsed = parseSlashCommand(currentInput);
    if (parsed) {
      const prompt = parsed.command.buildPrompt({
        editorSQL: lab.sql || "",
        args: parsed.args,
        databaseType: lab.selectedDSType,
        schema: lab.selectedSchema,
        lastError: lab.error || undefined,
      });

      if (!prompt) {
        if (parsed.command.requiresEditorSQL && !lab.sql?.trim()) toast.error(`${parsed.command.command} requires SQL in the editor`);
        else if (parsed.command.acceptsArgs && !parsed.args) toast.error(`Usage: ${parsed.command.command} ${parsed.command.argsHint || '<args>'}`);
        return;
      }
      return _handleSend(prompt);
    }
    return _handleSend(currentInput);
  }, [input, lab.sql, lab.selectedDSType, lab.selectedSchema, lab.error, _handleSend]);

  const handleCommandSelect = useCallback((cmd: SlashCommand) => {
    if (cmd.acceptsArgs) {
      setInput(cmd.command + " ");
      setShowCommandMenu(false);
    } else {
      setInput(cmd.command);
      setShowCommandMenu(false);
      setTimeout(async () => {
        const prompt = cmd.buildPrompt({
          editorSQL: lab.sql || "",
          args: "",
          databaseType: lab.selectedDSType,
          schema: lab.selectedSchema,
          lastError: lab.error || undefined,
        });
        if (!prompt) {
          if (cmd.requiresEditorSQL && !lab.sql?.trim()) toast.error(`${cmd.command} requires SQL in the editor`);
          return;
        }
        setInput("");
        await _handleSend(prompt);
      }, 0);
    }
  }, [lab.sql, lab.selectedDSType, lab.selectedSchema, lab.error, _handleSend]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (showCommandMenu) {
      const filtered = filterCommands(input);
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
  };

  const AIActions = {
    onExplain: async (s: string) => {
      setIsTyping(true);
      try {
        const res = await aiApi.explainSQL({ sql: s, modelId: selectedModel });
        addAssistantMessage(res.explanation);
      } finally { setIsTyping(false); }
    },
    onOptimize: async (s: string) => {
      setIsTyping(true);
      try {
        const res = await aiApi.optimizeSQL({ sql: s, databaseId: lab.selectedDS, schema: lab.selectedSchema, modelId: selectedModel });
        addAssistantMessage("Here is an optimized version:", res.sql || res.result);
      } finally { setIsTyping(false); }
    },
    onApply: (sql: string) => lab.setSql(sql),
    onSuggestionClick: (suggestion: string) => _handleSend(suggestion)
  };

  if (!lab.showAISidebar) return null;

  return (
    <div className="w-full h-full flex flex-col glass animate-in fade-in slide-in-from-right duration-500 relative">
      <AIAssistantHeader
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onNewChat={() => { startNewChat(); setShowHistory(false); }}
        onClose={() => lab.setShowAISidebar(false)}
      />

      {showHistory ? (
        <div className="flex-1 overflow-hidden bg-muted/5 flex flex-col">
          <div className="p-3 bg-muted/20 border-b border-border font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 flex items-center justify-between">
            <span>Recent Conversations</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ConversationHistory
              conversations={conversations}
              currentId={conversationId}
              onSelect={(id) => { loadConversation(id); setShowHistory(false); }}
              onRefresh={() => loadConversations(lab.selectedDS || undefined)}
              isLoading={isLoadingConversations}
            />
          </div>
        </div>
      ) : (
        <AIChatMessages
          messages={messages}
          isTyping={isTyping}
          isFetchingConversation={isFetchingConversation}
          virtualizer={virtualizer}
          parentRef={parentRef}
          conversationId={conversationId}
          {...AIActions}
        />
      )}

      <AIChatInput
        input={input}
        onInputChange={setInput}
        onKeyDown={onKeyDown}
        isTyping={isTyping}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        availableModels={availableModels}
        onSend={handleSendRequest}
        showCommandMenu={showCommandMenu}
        commandMenuIndex={commandMenuIndex}
        onCommandSelect={handleCommandSelect}
      />
    </div>
  );
}
