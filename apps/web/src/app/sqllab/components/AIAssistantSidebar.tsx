/**
 * @file AIAssistantSidebar.tsx
 * @description AI coding assistant for SQL Lab, providing query generation, explanation, optimization, and bug fixing capabilities.
 */

import React, { useState, useRef, useEffect } from "react";
import { Zap, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Message, AIMessage } from "./ai/AIMessage";
import { useSQLLabContext } from "../context/SQLLabContext";

/**
 * Collapsible sidebar housing the AI conversational agent for SQL tasks.
 */
export function AIAssistantSidebar() {
  const lab = useSQLLabContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    id: "1",
    role: "assistant",
    content: "Hello! I'm your AI SQL Assistant. I can generate optimized queries, explain code, and fix errors. How can I help?",
  }]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateSQLMutation = useMutation({ mutationFn: (vars: any) => aiApi.generateSQL(vars) });
  const explainSQLMutation = useMutation({ mutationFn: (vars: any) => aiApi.explainSQL(vars) });
  const optimizeSQLMutation = useMutation({ mutationFn: (vars: any) => aiApi.optimizeSQL(vars) });
  const fixSQLMutation = useMutation({ mutationFn: (vars: any) => aiApi.fixSQL(vars) });

  useEffect(() => {
    if (lab.fixSQLError && lab.sql && lab.showAISidebar) {
      handleFix(lab.sql, lab.fixSQLError);
    }
  }, [lab.fixSQLError, lab.showAISidebar]);

  const handleFix = async (sql: string, error: string) => {
    setIsTyping(true);
    try {
      const response = await fixSQLMutation.mutateAsync({
        sql, error, databaseId: lab.selectedDS, schema: lab.selectedSchema,
      });
      addAssistantMessage("I've analyzed the error. Here is the corrected query:", response.sql, response.result);
    } catch (error) {
      toast.error("Failed to fix SQL");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !lab.selectedDS) {
      if (!lab.selectedDS) toast.error("Connect a database first.");
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await generateSQLMutation.mutateAsync({
        prompt: input, databaseId: lab.selectedDS, schema: lab.selectedSchema,
      });
      addAssistantMessage("I've crafted this query for you:", response.sql, undefined, true);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate SQL");
    } finally {
      setIsTyping(false);
    }
  };

  const addAssistantMessage = (content: string, sql?: string, explanation?: string, isActionable = true) => {
    const msg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content,
      sql,
      explanation,
      isActionable,
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleApplySQL = (sql: string) => {
    lab.setSql(sql);
    toast.success("AI SQL inserted into editor");
  };

  if (!lab.showAISidebar) return null;

  return (
    <div className="w-full h-full flex flex-col glass animate-in fade-in slide-in-from-right duration-500 relative">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 font-black uppercase tracking-tighter text-primary">
          <Zap className="h-5 w-5 fill-primary/20" />
          <span>AI Assistant 2.0</span>
          <div className="bg-primary/10 text-[10px] uppercase px-1.5 py-0.5 rounded border border-border tracking-widest font-bold">Elite</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => lab.setShowAISidebar(false)} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map(m => (
            <AIMessage
              key={m.id}
              message={m}
              onExplain={async (s) => addAssistantMessage((await explainSQLMutation.mutateAsync({ sql: s })).explanation)}
              onOptimize={async (s) => {
                  const res = await optimizeSQLMutation.mutateAsync({ sql: s, databaseId: lab.selectedDS, schema: lab.selectedSchema });
                  addAssistantMessage("Here is an optimized version:", res.sql || res.result);
              }}
              onApply={handleApplySQL}
            />
          ))}
          {isTyping && (
            <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] ml-2 animate-pulse">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Synthesizing...</span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-muted/10 backdrop-blur-2xl">
        <div className="relative group">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type instructions for AI..."
            className="pr-14 py-7 rounded-2xl border-border focus-visible:ring-primary/30 bg-background shadow-inner text-sm"
          />
          <Button
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-lg active:scale-95"
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-3 text-center uppercase font-bold tracking-widest">
          Powered by Gemini 2.0 Flash • Agentic Mode
        </p>
      </div>
    </div>
  );
}
