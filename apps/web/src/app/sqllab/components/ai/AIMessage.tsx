/**
 * @file AIMessage.tsx
 * @description Main message orchestrator that handles different types of AI and User responses.
 * Follows SRP by delegating rendering of specialized sections to sub-components.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FileSearch, MessageSquare, User, BrainCircuit } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { aiApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Types
import { Message } from "./types";

// Sub-components
import { DataTablePreview } from "./DataTablePreview";
import { SQLBlock } from "./SQLBlock";
import { ReasoningSection } from "./ReasoningSection";
import { FeedbackSection } from "./FeedbackSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SuggestionList } from "./SuggestionList";

// Utils
import { extractConfidence } from "./ai-utils";

interface AIMessageProps {
  message: Message;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onApply: (sql: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  conversationId?: string | null;
}

const AIMessageComponent = ({
  message,
  onExplain,
  onOptimize,
  onApply,
  onSuggestionClick,
  conversationId
}: AIMessageProps) => {
  const [isThoughtVisible, setIsThoughtVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [shouldShowCorrection, setShouldShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Auto-expand reasoning when it starts streaming without final results
  useEffect(() => {
    if (message.thought && !message.sql && !isThoughtVisible) {
      setIsThoughtVisible(true);
    }
  }, [message.thought, message.sql, isThoughtVisible]);

  const status = useMemo(() => {
    if (message.content?.startsWith("Error:")) return null;
    if (message.sql || (message.content && !message.content.includes("Thinking"))) return null;
    if (!message.content && !message.thought && !message.sql) return "Brainstorming SQL strategy...";
    return null;
  }, [message.content, message.thought, message.sql]);

  const { score, cleaned } = useMemo(() => 
    extractConfidence(message.content || "", message.confidence), 
    [message.content, message.confidence]
  );

  const isError = message.content?.startsWith("Error:");
  const hasTextContent = cleaned.trim().length > 0 &&
    !cleaned.includes("Crafting the SQL") &&
    !cleaned.includes("<thinking>");
  
  const showPrimaryBubble = Boolean(status) || hasTextContent || Boolean(message.explanation) || isError;

  const handleFeedback = useCallback(async (rating: 1 | -1) => {
    setFeedbackRating(rating);
    if (rating === -1) {
      setShouldShowCorrection(true);
      return;
    }
    try {
      await aiApi.submitFeedback({
        messageId: message.id,
        rating,
        conversationId: conversationId || undefined,
      });
      setIsFeedbackSubmitted(true);
      toast.success("Thanks for the feedback!");
    } catch {
      toast.error("Failed to save feedback");
    }
  }, [message.id, conversationId]);

  const handleSubmitCorrection = useCallback(async () => {
    try {
      await aiApi.submitFeedback({
        messageId: message.id,
        rating: -1,
        correction: correctionText,
        conversationId: conversationId || undefined,
      });
      setIsFeedbackSubmitted(true);
      setShouldShowCorrection(false);
      toast.success("Feedback saved — we'll improve!");
    } catch {
      toast.error("Failed to save feedback");
    }
  }, [message.id, conversationId, correctionText]);

  const handleCopy = useCallback(() => {
    if (message.sql) {
      navigator.clipboard.writeText(message.sql);
      setIsCopied(true);
      toast.success('SQL copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [message.sql]);

  return (
    <div className={cn(
      "flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
      message.role === "user" ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar Icon */}
      <div className={cn(
        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all duration-500",
        message.role === "user"
          ? "bg-primary/20 border-primary/30 text-primary"
          : "bg-muted border-border/50 text-muted-foreground"
      )}>
        {message.role === "user" ? <User className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
      </div>

      <div className={cn(
        "flex flex-col gap-2 max-w-[85%] group",
        message.role === "user" ? "items-end" : "items-start w-full ai-message",
      )}>
        {/* 1. Reasoning Section (Assistant only) */}
        {message.role === "assistant" && (message.thought || (message.steps && message.steps.length > 0)) && (
          <ReasoningSection
            thought={message.thought}
            steps={message.steps}
            showThought={isThoughtVisible}
            onToggle={() => setIsThoughtVisible(!isThoughtVisible)}
            isDark={isDark}
            isGeneratingSQL={!message.sql && !isError && !message.content}
          />
        )}

        {/* 2. Primary Response Bubble */}
        {(showPrimaryBubble || message.role === "user") && (
          <div className={cn(
            "p-4 rounded-3xl text-[12px] leading-relaxed transition-all relative w-full",
            message.role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-none shadow-lg w-fit ml-auto"
              : isDark ? "glass-v2 border border-white/5" : "bg-white border border-slate-200 shadow-sm"
          )}>
            {message.role === "assistant" && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {status ? (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-1.5 animate-pulse">
                      <BrainCircuit className="h-3 w-3" /> {status}
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> AI Response
                    </span>
                  )}
                </div>
                {message.confidence !== undefined && !status && <ConfidenceBadge score={score} />}
              </div>
            )}

            <MarkdownRenderer
              content={message.role === "user" ? message.content : (cleaned || message.content)}
              isDark={isDark}
              role={message.role}
              className={isError ? "text-destructive font-medium" : ""}
            />

            {message.explanation && message.role === "assistant" && (
              <div className="pt-3 mt-4 border-t border-border/40 text-[11.5px] text-muted-foreground italic leading-relaxed">
                <MarkdownRenderer
                  content={message.explanation}
                  isDark={isDark}
                  role="assistant"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. Specialized Result Sections (SQL, Data, Analysis) */}
        {message.role === "assistant" && (
          <div className="w-full flex flex-col gap-4 mt-1">
            {message.sql && (
              <SQLBlock
                sql={message.sql}
                isDark={isDark}
                onCopy={handleCopy}
                copied={isCopied}
                onExplain={onExplain}
                onOptimize={onOptimize}
                onApply={onApply}
              />
            )}

            {message.columns && message.data && message.data.length > 0 && (
              <DataTablePreview columns={message.columns} data={message.data} />
            )}

            {message.analysis && (
              <div className={cn(
                "p-5 rounded-3xl text-[12px] leading-relaxed shadow-sm border",
                isDark ? "bg-[#111419] border-white/5" : "bg-slate-50 border-slate-100"
              )}>
                <div className="flex items-center gap-2 mb-3 text-primary font-black uppercase tracking-widest text-[10px]">
                  <FileSearch className="h-3.5 w-3.5" /> Detailed Analysis
                </div>
                <MarkdownRenderer
                  content={message.analysis}
                  isDark={isDark}
                  role="assistant"
                />
              </div>
            )}
          </div>
        )}

        {/* 4. Feedback & Suggestions */}
        {message.role === "assistant" && (
          <div className="w-full">
            {message.content && !message.content.startsWith("Error:") && (
              <FeedbackSection
                feedbackSubmitted={isFeedbackSubmitted}
                feedbackRating={feedbackRating}
                showCorrection={shouldShowCorrection}
                correctionText={correctionText}
                onRating={handleFeedback}
                onCorrectionChange={setCorrectionText}
                onSubmitCorrection={handleSubmitCorrection}
              />
            )}

            <SuggestionList
              suggestions={message.suggestions || []}
              onSuggestionClick={onSuggestionClick || (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const AIMessage = React.memo(AIMessageComponent);
AIMessage.displayName = "AIMessage";
