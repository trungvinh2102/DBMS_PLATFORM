import { useState, useRef, useEffect } from "react";
import {
  Zap,
  Send,
  Copy,
  ArrowRight,
  Sparkles,
  X,
  FileSearch,
  Wand2,
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
  explanation?: string;
  isActionable?: boolean;
}

import { useSQLLabContext } from "../context/SQLLabContext";

export function AIAssistantSidebar() {
  const lab = useSQLLabContext();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI SQL Assistant. I can generate optimized queries, explain existing code, and help you fix errors. How can I assist you today?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateSQLMutation = useMutation({
    mutationFn: (vars: any) => aiApi.generateSQL(vars),
  });

  const explainSQLMutation = useMutation({
    mutationFn: (vars: any) => aiApi.explainSQL(vars),
  });

  const optimizeSQLMutation = useMutation({
    mutationFn: (vars: any) => aiApi.optimizeSQL(vars),
  });

  const fixSQLMutation = useMutation({
    mutationFn: (vars: any) => aiApi.fixSQL(vars),
  });

  useEffect(() => {
    if (lab.fixSQLError && lab.sql && lab.showAISidebar) {
      handleFix(lab.sql, lab.fixSQLError);
    }
  }, [lab.fixSQLError, lab.showAISidebar]);

  const handleFix = async (sql: string, error: string) => {
    setIsTyping(true);
    try {
      const response = await fixSQLMutation.mutateAsync({
        sql,
        error,
        databaseId: lab.selectedDS,
        schema: lab.selectedSchema,
      });
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "I've analyzed the error. Here is the corrected query:",
        sql: response.sql,
        explanation: response.result,
        isActionable: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Failed to fix SQL");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!lab.selectedDS) {
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
        databaseId: lab.selectedDS,
        schema: lab.selectedSchema,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I've crafted this query for your requirements:",
        sql: response.sql,
        isActionable: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate SQL");
    } finally {
      setIsTyping(false);
    }
  };

  const handleExplain = async (sql: string) => {
    setIsTyping(true);
    try {
      const response = await explainSQLMutation.mutateAsync({ sql });
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.explanation,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Failed to explain SQL");
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptimize = async (sql: string) => {
    setIsTyping(true);
    try {
      const response = await optimizeSQLMutation.mutateAsync({
        sql,
        databaseId: lab.selectedDS,
        schema: lab.selectedSchema,
      });
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Here is an optimized version of the query:",
        sql: response.sql || response.result,
        isActionable: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Failed to optimize SQL");
    } finally {
      setIsTyping(false);
    }
  };

  if (!lab.showAISidebar) return null;

  return (
    <div className="w-full h-full flex flex-col glass animate-in fade-in slide-in-from-right duration-500 relative">
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 font-black uppercase tracking-tighter text-primary">
          <Zap className="h-5 w-5 fill-primary/20" />
          <span>AI Assistant 2.0</span>
          <div className="bg-primary/10 text-[10px] uppercase px-1.5 py-0.5 rounded border border-border tracking-widest font-bold">
            Elite
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => lab.setShowAISidebar(false)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
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
                "flex flex-col gap-2 max-w-[92%]",
                message.role === "user"
                  ? "ml-auto items-end"
                  : "mr-auto items-start",
              )}
            >
              <div
                className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-lg transition-all hover-lift",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10"
                    : "glass border border-border rounded-tl-none backdrop-blur-xl bg-muted/40",
                )}
              >
                {message.content}
                {message.explanation && (
                  <div className="mt-2 pt-2 border-t border-border text-[12px] text-muted-foreground italic">
                    {message.explanation}
                  </div>
                )}
              </div>

              {message.sql && (
                <div className="w-full bg-muted/90 rounded-xl p-4 border border-border shadow-2xl group relative overflow-hidden group hover-glow">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                      onClick={() => {
                        navigator.clipboard.writeText(message.sql!);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <pre className="text-[12px] text-foreground font-mono whitespace-pre-wrap break-all pr-8">
                    {message.sql}
                  </pre>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="h-8 border-border bg-muted/50 hover:bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => handleExplain(message.sql!)}
                    >
                      <FileSearch className="h-3.5 w-3.5 mr-2" />
                      Explain
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 border-border bg-muted/50 hover:bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest"
                      onClick={() => handleOptimize(message.sql!)}
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-2" />
                      Optimize
                    </Button>
                  </div>

                  <Button
                    className="w-full mt-2 h-9 bg-primary hover:bg-primary/90 text-primary-foreground border-none text-[11px] font-black uppercase tracking-[0.2em]"
                    onClick={() => {
                      lab.setSql(message.sql!);
                      toast.success("AI SQL inserted into editor");
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Apply Query
                  </Button>
                </div>
              )}
            </div>
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
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
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
