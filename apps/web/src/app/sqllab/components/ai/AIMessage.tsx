/**
 * @file AIMessage.tsx
 * @description Component for rendering a single message in the AI assistant chat, with SQL preview and action buttons.
 */

import React from "react";
import { Copy, FileSearch, Wand2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  explanation?: string;
  isActionable?: boolean;
}

interface AIMessageProps {
  message: Message;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onApply: (sql: string) => void;
}

export function AIMessage({ message, onExplain, onOptimize, onApply }: AIMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 max-w-[92%]",
        message.role === "user" ? "ml-auto items-end" : "mr-auto items-start",
      )}
    >
      <div
        className={cn(
          "p-4 rounded-2xl text-sm leading-relaxed shadow-lg transition-all",
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
        <div className="w-full bg-muted/90 rounded-xl p-4 border border-border shadow-2xl group relative overflow-hidden hover-glow transition-all">
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
              onClick={() => onExplain(message.sql!)}
            >
              <FileSearch className="h-3.5 w-3.5 mr-2" />
              Explain
            </Button>
            <Button
              variant="outline"
              className="h-8 border-border bg-muted/50 hover:bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest"
              onClick={() => onOptimize(message.sql!)}
            >
              <Wand2 className="h-3.5 w-3.5 mr-2" />
              Optimize
            </Button>
          </div>

          <Button
            className="w-full mt-2 h-9 bg-primary hover:bg-primary/90 text-primary-foreground border-none text-[11px] font-black uppercase tracking-[0.2em]"
            onClick={() => onApply(message.sql!)}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Apply Query
          </Button>
        </div>
      )}
    </div>
  );
}
