/**
 * @file AIAssistantSidebar.tsx
 * @description Glassmorphic AI Assistant sidebar for SQLLab.
 * Features chat-based SQL generation, explanation, and optimization.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
  Zap,
  Send,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  MessageSquare,
  History,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
}

interface AIAssistantSidebarProps {
  show: boolean;
  onClose: () => void;
  onApplySQL: (sql: string) => void;
  databaseId: string;
  schema?: string;
}

export function AIAssistantSidebar({
  show,
  onClose,
  onApplySQL,
  databaseId,
  schema,
}: AIAssistantSidebarProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI SQL Assistant. How can I help you today? You can ask me to generate SQL, explain a query, or optimize your code.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateSQLMutation = useMutation({
    mutationFn: (vars: any) => aiApi.generateSQL(vars),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!databaseId) {
      toast.error("Please select a database connection first.");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await generateSQLMutation.mutateAsync({
        prompt: input,
        databaseId,
        schema,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I've generated a query for you:",
        sql: response.sql,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate SQL");
    } finally {
      setIsTyping(false);
    }
  };

  if (!show) return null;

  return (
    <div className="w-full h-full flex flex-col bg-background/95 backdrop-blur-xl animate-in fade-in duration-300 relative">
      <div className="flex items-center justify-between p-4 border-b bg-amber-500/5">
        <div className="flex items-center gap-2 font-bold text-amber-600">
          <Zap className="h-5 w-5 fill-amber-500/20" />
          <span>AI SQL Assistant</span>
          <div className="bg-amber-500/10 text-[10px] uppercase px-1.5 py-0.5 rounded border border-amber-500/20 tracking-wider">
            Beta
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-2 max-w-[90%]",
                message.role === "user"
                  ? "ml-auto items-end"
                  : "mr-auto items-start",
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted/50 border border-border/50 rounded-tl-none backdrop-blur-sm",
                )}
              >
                {message.content}
              </div>

              {message.sql && (
                <div className="w-full bg-zinc-950 rounded-lg p-3 border border-amber-500/20 shadow-md group relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(message.sql!);
                        toast.success("SQL copied to clipboard");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <pre className="text-[12px] text-zinc-300 font-mono whitespace-pre-wrap break-all">
                    {message.sql}
                  </pre>
                  <Button
                    className="w-full mt-3 h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-none text-[11px] font-bold"
                    onClick={() => onApplySQL(message.sql!)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-2" />
                    Insert into Editor
                  </Button>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs italic ml-2">
              <Sparkles className="h-3 w-3 animate-pulse text-amber-500" />
              <span>Assistant is thinking...</span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/20 backdrop-blur-md">
        <div className="relative group">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI to generate SQL..."
            className="pr-12 py-6 rounded-2xl border-amber-500/10 focus-visible:ring-amber-500/30 bg-background/50"
          />
          <Button
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-amber-500 hover:bg-amber-600 transition-all"
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          AI can make mistakes. Please verify generated queries.
        </p>
      </div>
    </div>
  );
}
