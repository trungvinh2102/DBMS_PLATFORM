/**
 * @file AIChatMessages.tsx
 * @description Renders the list of AI chat messages with virtualization and loading states.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AIMessage } from "./AIMessage";
import { Message, SqlDataPreview } from "./types";

interface AIChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  isFetchingConversation: boolean;
  parentRef: React.RefObject<HTMLDivElement | null>;
  conversationId?: string | null;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onShowSqlData: (sql: string) => Promise<SqlDataPreview>;
  onSuggestionClick: (suggestion: string) => void;
}

const AIChatMessagesComponent = ({
  messages,
  isTyping,
  isFetchingConversation,
  parentRef,
  conversationId,
  onExplain,
  onOptimize,
  onShowSqlData,
  onSuggestionClick
}: AIChatMessagesProps) => (
  <div
    ref={parentRef}
    className="flex-1 overflow-y-auto scroll-smooth px-2 py-3 scrollbar-thin scrollbar-thumb-muted focus:outline-none md:px-3"
  >
    <div className="flex w-full flex-col gap-3">
      {isFetchingConversation ? (
        <div className="flex flex-col gap-4 w-full animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex gap-2 w-full", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className={cn("flex flex-col gap-1.5 w-[80%]", i % 2 === 0 ? "items-end" : "items-start")}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className={cn("h-20 w-full rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
                {i % 2 !== 0 && <Skeleton className="h-32 w-full rounded-xl mt-1" />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        messages.map((m) => (
          <AIMessage
            key={m.id}
            message={m}
            onExplain={onExplain}
            onOptimize={onOptimize}
            onShowSqlData={onShowSqlData}
            onSuggestionClick={onSuggestionClick}
            conversationId={conversationId}
          />
        ))
      )}

      {messages.length === 0 && !isTyping && !isFetchingConversation && (
        <div className="mt-8 flex min-h-56 w-full select-none flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/15 p-4 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-primary/70" />
          <h2 className="text-lg font-black tracking-tight">Start with a data question</h2>
          <p className="mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
            Ask for SQL, chart-ready queries, explanations, optimization, or a result interpretation.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
            <kbd className="px-2 py-0.5 rounded border border-border/50 bg-muted/50 text-[10px] font-mono font-bold">/</kbd>
            <span className="text-[10px] uppercase tracking-widest font-bold">for quick commands</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

export const AIChatMessages = React.memo(AIChatMessagesComponent);
AIChatMessages.displayName = "AIChatMessages";
