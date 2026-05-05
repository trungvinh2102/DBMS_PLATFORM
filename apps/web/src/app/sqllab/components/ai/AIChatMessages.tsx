/**
 * @file AIChatMessages.tsx
 * @description Renders the list of AI chat messages with virtualization and loading states.
 */

import React from "react";
import { Sparkles } from "lucide-react";
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
                {m ? (
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
