/**
 * @file AIChatMessages.tsx
 * @description Renders the list of AI chat messages with virtualization and loading states.
 */

import React from "react";
import { BrainCircuit, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AIMessage, Message } from "./AIMessage";

interface AIChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  isFetchingConversation: boolean;
  virtualizer: any;
  parentRef: React.RefObject<HTMLDivElement | null>;
  conversationId?: string | null;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onApply: (sql: string) => void;
  onSuggestionClick: (suggestion: string) => void;
}

export const AIChatMessages = ({
  messages,
  isTyping,
  isFetchingConversation,
  virtualizer,
  parentRef,
  conversationId,
  onExplain,
  onOptimize,
  onApply,
  onSuggestionClick
}: AIChatMessagesProps) => (
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
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className={cn("flex flex-col gap-2 w-[80%]", i % 2 === 0 ? "items-end" : "items-start")}>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className={cn("h-20 w-full rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
                {i % 2 !== 0 && <Skeleton className="h-32 w-full rounded-xl mt-2" />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        virtualizer.getVirtualItems().map((vMsg: any) => {
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
                    onExplain={onExplain}
                    onOptimize={onOptimize}
                    onApply={onApply}
                    onSuggestionClick={onSuggestionClick}
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
);
