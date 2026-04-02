/**
 * @file AIAssistantSidebar.tsx
 * @description AI coding assistant for SQL Lab, providing query generation, explanation, optimization, and bug fixing capabilities.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Zap, Send, Sparkles, X, BrainCircuit, History, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";
import { AIMessage } from "./ai/AIMessage";
import { useSQLLabContext } from "../context/SQLLabContext";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAIChat } from "../hooks/useAIChat";
import { ConversationHistory } from "./ai/ConversationHistory";
import { SlashCommandMenu } from "./ai/SlashCommandMenu";
import { parseSlashCommand, filterCommands, type SlashCommand } from "../utils/slash-commands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
    loadHistory,
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

  // Initialize models and load history on mount or database change
  useEffect(() => {
    const init = async () => {
      try {
        const [models] = await Promise.all([
          aiApi.getModels(),
          loadConversations(lab.selectedDS || undefined) // Filter by current database
        ]);

        setAvailableModels(models);
        if (models && models.length > 0) {
          // Default to the first model in the list
          setSelectedModel(models[0].modelId);
        }
      } catch (e) {
        console.error("Failed to initialize AI sidecar", e);
      }
    };
    init();
  }, [lab.selectedDS, loadConversations]);

  // Virtualization for handling long chat histories
  const virtualizer = useVirtualizer({
    count: messages.length + (isTyping ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  // Auto-scroll logic on new messages, typing state changes, or streaming content
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll to bottom whenever messages change or the last message is being updated
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, messages[messages.length - 1]?.content, messages[messages.length - 1]?.thought, isTyping, virtualizer]);

  /**
   * Automatic Error Fixing:
   * Monitors the global SQLLab context for 'fixSQLError' triggers.
   */
  useEffect(() => {
    if (lab.fixSQLError) {
      const errorMsg = lab.fixSQLError;
      const currentSql = lab.sql;
      // Clear the trigger immediately
      lab.setFixSQLError(null);

      const prompt = `I'm getting this SQL error: "${errorMsg}".\n\nHere is my current SQL:\n\`\`\`sql\n${currentSql}\n\`\`\`\n\nPlease analyze and fix this query.`;

      // Always start a new chat for "Fix with AI" to keep it clean
      startNewChat();
      setShowHistory(false);

      // Small timeout to ensure state is cleared before sending
      setTimeout(() => {
        _handleSend(prompt);
      }, 0);
    }
  }, [lab.fixSQLError, lab.sql, _handleSend, lab.setFixSQLError, startNewChat]);

  // ─── Slash Command Detection ─────────────────────────────────
  const handleSendRequest = useCallback(async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    setShowCommandMenu(false);

    // Check if input is a slash command
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
        // Command requires context that's missing
        if (parsed.command.requiresEditorSQL && !lab.sql?.trim()) {
          toast.error(`${parsed.command.command} requires SQL in the editor`);
        } else if (parsed.command.acceptsArgs && !parsed.args) {
          toast.error(`Usage: ${parsed.command.command} ${parsed.command.argsHint || '<args>'}`);
        }
        return;
      }

      await _handleSend(prompt);
      return;
    }

    // Regular message — send as-is
    await _handleSend(currentInput);
  }, [input, lab.sql, lab.selectedDSType, lab.selectedSchema, lab.error, _handleSend]);

  // Handle command selection from dropdown menu
  const handleCommandSelect = useCallback((cmd: SlashCommand) => {
    if (cmd.acceptsArgs) {
      // Set input to command + space, so user can type args
      setInput(cmd.command + " ");
      setShowCommandMenu(false);
    } else {
      // Execute immediately
      setInput(cmd.command);
      setShowCommandMenu(false);
      // Use setTimeout to let state update, then send
      setTimeout(async () => {
        const prompt = cmd.buildPrompt({
          editorSQL: lab.sql || "",
          args: "",
          databaseType: lab.selectedDSType,
          schema: lab.selectedSchema,
          lastError: lab.error || undefined,
        });
        if (!prompt) {
          if (cmd.requiresEditorSQL && !lab.sql?.trim()) {
            toast.error(`${cmd.command} requires SQL in the editor`);
          }
          return;
        }
        setInput("");
        await _handleSend(prompt);
      }, 0);
    }
  }, [lab.sql, lab.selectedDSType, lab.selectedSchema, lab.error, _handleSend]);

  // Update command menu visibility based on input
  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.startsWith("/") && !trimmed.includes(" ")) {
      setShowCommandMenu(true);
      setCommandMenuIndex(0);
    } else {
      setShowCommandMenu(false);
    }
  }, [input]);

  const handleApplySQL = (sql: string) => {
    lab.setSql(sql);
    toast.success("AI SQL inserted into editor");
  };

  const handleExplain = async (s: string) => {
    setIsTyping(true);
    try {
      const res = await aiApi.explainSQL({ sql: s, modelId: selectedModel });
      addAssistantMessage(res.explanation);
    } finally { setIsTyping(false); }
  };

  const handleOptimize = async (s: string) => {
    setIsTyping(true);
    try {
      const res = await aiApi.optimizeSQL({ sql: s, databaseId: lab.selectedDS, schema: lab.selectedSchema, modelId: selectedModel });
      addAssistantMessage("Here is an optimized version:", res.sql || res.result);
    } finally { setIsTyping(false); }
  };

  const handleSuggestionClick = useCallback((suggestion: string) => {
    _handleSend(suggestion);
  }, [_handleSend]);

  if (!lab.showAISidebar) return null;

  return (
    <div className="w-full h-full flex flex-col glass animate-in fade-in slide-in-from-right duration-500 relative">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">

          <div className="flex items-center gap-1 font-black uppercase tracking-tighter text-primary">
            <Zap className="h-4 w-4 fill-primary/20" />
            <span className="text-sm">AI Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className={cn("h-8 w-8 rounded-full", showHistory && "bg-primary/10 text-primary")}
          >
            {showHistory ? <MessageSquare className="h-4 w-4" /> : <History className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { startNewChat(); setShowHistory(false); }}
            className="h-8 w-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => lab.setShowAISidebar(false)} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

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
        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth scrollbar-thin scrollbar-thumb-muted focus:outline-none"
        >
          <div
            className="relative w-full"
            style={{ height: isFetchingConversation ? 'auto' : `${virtualizer.getTotalSize()}px` }}
          >
            {isFetchingConversation ? (
              <div className="flex flex-col gap-8 w-full animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("flex gap-3 w-full", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className={cn("flex flex-col gap-2 w-[80%]", i % 2 === 0 ? "items-end" : "items-start")}>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className={cn("h-20 w-full rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
                      {i % 2 !== 0 && <Skeleton className="h-32 w-full rounded-xl mt-2" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              virtualizer.getVirtualItems().map((vMsg) => {
                const isLastTyping = isTyping && vMsg.index === messages.length;
                const m = messages[vMsg.index];

                return (
                  <div
                    key={vMsg.key}
                    ref={virtualizer.measureElement}
                    data-index={vMsg.index}
                    className="absolute top-0 left-0 w-full"
                    style={{ transform: `translateY(${vMsg.start}px)` }}
                  >
                    <div className="pb-6">
                      {isLastTyping ? (
                        <div className="relative overflow-hidden bg-muted/20 p-6 rounded-3xl border border-dashed border-primary/20 flex flex-col items-center gap-4 transition-all duration-1000">
                          <div className="absolute inset-0 glass-orb" />
                          <div className="relative z-10 flex items-center justify-center">
                            <BrainCircuit className="h-8 w-8 text-primary animate-pulse" />
                            <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-bounce" />
                          </div>
                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 animate-pulse">
                              Synthesizing Intelligence
                            </span>
                            <div className="flex gap-1">
                              {[0, 1, 2].map((i) => (
                                <div key={i} className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : m ? (
                        <AIMessage
                          message={m}
                          onExplain={handleExplain}
                          onOptimize={handleOptimize}
                          onApply={handleApplySQL}
                          onSuggestionClick={handleSuggestionClick}
                          conversationId={conversationId}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}

            {messages.length === 0 && !isTyping && !isFetchingConversation && (
              <div className="h-full mt-20 flex flex-col items-center justify-center p-8 text-center opacity-30 select-none">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <h2 className="text-xl font-black uppercase tracking-tighter">New Chat</h2>
                <p className="text-xs uppercase tracking-widest font-bold">Describe your data needs to begin</p>
                <div className="mt-4 flex items-center gap-1.5">
                  <kbd className="px-2 py-0.5 rounded border border-border/50 bg-muted/50 text-[10px] font-mono font-bold">/</kbd>
                  <span className="text-[10px] uppercase tracking-widest font-bold">for quick commands</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border bg-muted/10 backdrop-blur-3xl">
        <div className="flex flex-col gap-3">
          <div className="relative group bg-background/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-all p-2 shadow-inner">
            {/* Slash Command Autocomplete Menu */}
            <SlashCommandMenu
              inputValue={input}
              onSelect={handleCommandSelect}
              visible={showCommandMenu}
              activeIndex={commandMenuIndex}
            />

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Handle command menu keyboard navigation
                if (showCommandMenu) {
                  const filtered = filterCommands(input);
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCommandMenuIndex((prev) => (prev + 1) % filtered.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCommandMenuIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const selected = filtered[commandMenuIndex];
                    if (selected) {
                      handleCommandSelect(selected);
                    }
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setShowCommandMenu(false);
                    return;
                  }
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const selected = filtered[commandMenuIndex];
                    if (selected) {
                      handleCommandSelect(selected);
                    }
                    return;
                  }
                }

                // Normal Enter handling
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendRequest();
                }
              }}
              placeholder={showCommandMenu ? 'Type a command...' : 'Ask anything or type / for commands...'}
              className="min-h-[80px] w-full border-none bg-transparent focus-visible:ring-0 resize-none text-sm p-2"
            />

            <div className="flex items-center justify-between mt-2 px-1 pb-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-3.5 w-3.5 text-primary/70" />
                <Select value={selectedModel} onValueChange={(val) => val && setSelectedModel(val)}>
                  <SelectTrigger className="border-none bg-muted/50 hover:bg-muted h-7 px-3 focus:ring-0 text-[10px] font-black uppercase tracking-widest min-w-[120px] justify-between shadow-none rounded-lg">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/50">
                    {availableModels.map(m => (
                      <SelectItem key={m.modelId} value={m.modelId} className="text-[10px] font-bold uppercase tracking-wider">
                        {m.name}
                      </SelectItem>
                    ))}
                    {availableModels.length === 0 && (
                      <SelectItem value="gemini-1.5-flash" className="text-[10px] font-bold uppercase tracking-wider">
                        Gemini 1.5 Flash
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className={cn(
                  "h-8 px-4 rounded-lg transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest",
                  input.trim() ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                onClick={handleSendRequest}
                disabled={isTyping || !input.trim()}
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
