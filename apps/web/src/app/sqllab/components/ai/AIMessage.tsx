/**
 * @file AIMessage.tsx
 * @description Renders individual chat messages within the AI Assistant. 
 * Provides a structured layout for reasoning, text, SQL, and data previews.
 */

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { FileSearch, ArrowRight, MessageSquare, User, BrainCircuit } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { aiApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sub-components
import { DataTablePreview } from "./DataTablePreview";
import { SQLBlock } from "./SQLBlock";
import { ReasoningSection } from "./ReasoningSection";
import { FeedbackSection } from "./FeedbackSection";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { extractConfidence } from "./ai-utils";

// Lazy-loaded heavy components
const ReactMarkdown = React.lazy(() => import('react-markdown'));
const Prism = React.lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })));

// Prism Styles
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import oneLight from 'react-syntax-highlighter/dist/cjs/styles/prism/one-light';

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  explanation?: string;
  thought?: string;
  analysis?: string;
  confidence?: number;
  columns?: string[];
  data?: any[];
  isActionable?: boolean;
  suggestions?: string[];
}

interface AIMessageProps {
  message: Message;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onApply: (sql: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  conversationId?: string | null;
}

export function AIMessage({ 
  message, 
  onExplain, 
  onOptimize, 
  onApply, 
  onSuggestionClick, 
  conversationId 
}: AIMessageProps) {
  const [showThought, setShowThought] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Auto-expand reasoning when it starts streaming without final results
  useEffect(() => {
    if (message.thought && !message.sql && !showThought) {
      setShowThought(true);
    }
  }, [message.thought, message.sql, showThought]);

  const getStatus = useCallback(() => {
    if (message.content?.startsWith("Error:")) return null;
    if (!message.content && message.thought && !message.sql) return "Thinking...";
    if (message.thought && message.sql && !message.content) return "Generating SQL...";
    if (message.sql && !message.content) return "Finalizing...";
    return null;
  }, [message]);

  const status = getStatus();
  const { score, cleaned } = extractConfidence(message.content || "", message.confidence);
  const isError = message.content?.startsWith("Error:");
  const hasTextContent = cleaned.trim().length > 0 && !cleaned.includes("Crafting the SQL");
  const showPrimaryBubble = Boolean(status) || hasTextContent || Boolean(message.explanation) || isError;

  const handleFeedback = async (rating: 1 | -1) => {
    setFeedbackRating(rating);
    if (rating === -1) {
      setShowCorrection(true);
      return;
    }
    try {
      await aiApi.submitFeedback({
        messageId: message.id,
        rating,
        conversationId: conversationId || undefined,
      });
      setFeedbackSubmitted(true);
      toast.success("Thanks for the feedback!");
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const handleSubmitCorrection = async () => {
    try {
      await aiApi.submitFeedback({
        messageId: message.id,
        rating: -1,
        correction: correctionText,
        conversationId: conversationId || undefined,
      });
      setFeedbackSubmitted(true);
      setShowCorrection(false);
      toast.success("Feedback saved — we'll improve!");
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const handleCopy = () => {
    if (message.sql) {
      navigator.clipboard.writeText(message.sql);
      setCopied(true);
      toast.success('SQL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
        {message.role === "assistant" && message.thought && (
          <ReasoningSection 
            thought={message.thought}
            showThought={showThought}
            onToggle={() => setShowThought(!showThought)}
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
                  ) }
                </div>
                {score > 0 && <ConfidenceBadge score={score} />}
              </div>
            )}

            <div className={cn(
               message.role === "assistant" ? "prose prose-sm dark:prose-invert max-w-none" : "whitespace-pre-wrap"
            )}>
              <Suspense fallback={null}>
                <ReactMarkdown
                  components={{
                    code({ node, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <Prism
                          style={isDark ? vscDarkPlus : oneLight}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: "0.8em 0",
                            borderRadius: "10px",
                            fontSize: "10px",
                            background: message.role === "user" 
                              ? "rgba(0,0,0,0.2)" 
                              : isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
                            border: message.role === "user" ? "1px solid rgba(255,255,255,0.1)" : "none",
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </Prism>
                      ) : (
                        <code className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[10px]",
                          message.role === "user" ? "bg-black/20" : "bg-black/5 dark:bg-white/10"
                        )} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.role === "user" ? message.content : (cleaned || message.content)}
                </ReactMarkdown>
              </Suspense>
            </div>

            {message.explanation && message.role === "assistant" && (
              <div className="pt-3 mt-4 border-t border-border/40 text-[11.5px] text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                <Suspense fallback={null}>
                  <ReactMarkdown>{message.explanation}</ReactMarkdown>
                </Suspense>
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
                copied={copied}
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
                <div className="text-[11.5px] text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                  <Suspense fallback={null}>
                    <ReactMarkdown>{message.analysis}</ReactMarkdown>
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Feedback & Suggestions */}
        {message.role === "assistant" && (
          <div className="w-full">
            {message.content && !message.content.startsWith("Error:") && (
              <FeedbackSection 
                feedbackSubmitted={feedbackSubmitted}
                feedbackRating={feedbackRating}
                showCorrection={showCorrection}
                correctionText={correctionText}
                onRating={handleFeedback}
                onCorrectionChange={setCorrectionText}
                onSubmitCorrection={handleSubmitCorrection}
              />
            )}

            {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-700">
                {message.suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    className="px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-[10px] font-medium text-primary transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group/sug"
                  >
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse group-hover/sug:animate-bounce" />
                    {suggestion}
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 -translate-x-1 group-hover/sug:opacity-100 group-hover/sug:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
