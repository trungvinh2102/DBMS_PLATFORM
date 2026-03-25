/**
 * @file AIAssistantSidebar.tsx
 * @description AI coding assistant for SQL Lab, providing query generation, explanation, optimization, and bug fixing capabilities.
 */

import React, { useState, useRef, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AIAssistantSidebar() {
  const lab = useSQLLabContext();
  const [input, setInput] = useState("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
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
    setIsTyping 
  } = useAIChat(lab.selectedDS || undefined, lab.selectedSchema, selectedModel);

  // Initialize models and load history on mount or database change
  useEffect(() => {
    const init = async () => {
      try {
        const [models] = await Promise.all([
          aiApi.getModels(),
          loadConversations(lab.selectedDS || undefined)
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

  // Auto-scroll logic on new messages or typing state changes
  useEffect(() => {
    if (messages.length > 0) {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, isTyping, virtualizer]);

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

  const handleSendRequest = async () => {
    if (!input.trim()) return;
    setInput("");
    await _handleSend(input);
  };

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
          <div className="flex-1 overflow-hidden">
            <ConversationHistory 
              conversations={conversations} 
              currentId={conversationId} 
              onSelect={(id) => { loadConversation(id); setShowHistory(false); }}
              onRefresh={() => loadConversations(lab.selectedDS || undefined)}
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
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((vMsg) => {
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
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
            
            {messages.length === 0 && !isTyping && (
                <div className="h-full mt-20 flex flex-col items-center justify-center p-8 text-center opacity-30 select-none">
                    <Sparkles className="h-12 w-12 text-primary mb-4" />
                    <h2 className="text-xl font-black uppercase tracking-tighter">New Chat</h2>
                    <p className="text-xs uppercase tracking-widest font-bold">Describe your data needs to begin</p>
                </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border bg-muted/10 backdrop-blur-3xl">
        <div className="flex flex-col gap-3">
          <div className="relative group bg-background/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-all p-2 shadow-inner">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendRequest();
                }
              }}
              placeholder="Ask anything or describe the SQL you need..."
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
          <div className="text-[9px] text-center text-muted-foreground/60 uppercase tracking-widest font-medium">
            Press Enter to send • Shift + Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
