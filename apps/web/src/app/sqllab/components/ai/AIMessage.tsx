/**
 * @file AIMessage.tsx
 * @description Renders individual chat messages within the AI Assistant. 
 * Supports Markdown content, the Thinking Process (reasoning), 
 * and syntax-highlighted SQL code blocks with one-click copy and editor application.
 */

import React, { useState } from "react";
import { Copy, FileSearch, Wand2, ArrowRight, Sparkles, MessageSquare, Check, User, Bot, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Use standard React lazy loading for heavy dependencies
const ReactMarkdown = React.lazy(() => import('react-markdown'));
const Prism = React.lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })));

// Fixed: Use CJS version of style to avoid resolution issues in some loaders
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import oneLight from 'react-syntax-highlighter/dist/cjs/styles/prism/one-light';
import { useTheme } from "next-themes";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  explanation?: string;
  thought?: string;
  analysis?: string;
  isActionable?: boolean;
}

interface AIMessageProps {
  message: Message;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onApply: (sql: string) => void;
}

/**
 * AIMessage Component
 * @param props - Message data and interactive handlers
 * @returns A structured, styled message bubble suitable for conversational AI
 */
export function AIMessage({ message, onExplain, onOptimize, onApply }: AIMessageProps) {
  const [showThought, setShowThought] = useState(false);
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleCopy = () => {
    if (message.sql) {
        navigator.clipboard.writeText(message.sql);
        setCopied(true);
        toast.success("SQL copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn(
      "flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
      message.role === "user" ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar / Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-all duration-500",
        message.role === "user" 
          ? "bg-primary/20 border-primary/30 text-primary" 
          : "bg-muted border-border/50 text-muted-foreground group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary"
      )}>
        {message.role === "user" ? (
          <User className="h-4 w-4" />
        ) : (
          <BrainCircuit className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 max-w-[85%] group",
          message.role === "user" ? "items-end" : "items-start w-full",
        )}
      >
        {/* Reasoning Traceability: Thinking Section */}
        {message.role === "assistant" && message.thought && (
          <div className="w-full mb-1">
            <button
              onClick={() => setShowThought(!showThought)}
              className="flex items-center gap-2 text-primary hover:text-primary/100 transition-all py-1 px-2 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20"
            >
              <div className={cn(
                "p-1 rounded-md bg-primary/10 transition-transform duration-300",
                showThought ? "rotate-90" : "rotate-0"
              )}>
                <ArrowRight className="h-3 w-3" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Thinking Process
              </span>
            </button>
            
            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              showThought ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="p-3 rounded-xl bg-muted/30 border border-primary/10 text-[11px] text-muted-foreground leading-relaxed font-mono">
                  {message.thought}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Communication Bubble */}
        <div
          className={cn(
            "p-3 rounded-xl text-xs leading-relaxed shadow-lg transition-all border w-full",
            message.role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20 shadow-primary/20"
              : "glass border-border/50 rounded-tl-none backdrop-blur-xl bg-background/50",
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.content && !message.content.includes("Crafting the SQL") ? (
               <React.Suspense fallback={<div className="animate-pulse h-4 bg-muted w-3/4 rounded" />}>
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
                              margin: "1em 0",
                              borderRadius: "8px",
                              fontSize: "11px",
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </Prism>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
               </React.Suspense>
            ) : (
              <div className="flex items-center gap-2 animate-pulse text-muted-foreground italic text-xs">
                 <Sparkles className="h-3 w-3" />
                 Building intelligence...
              </div>
            )}
          </div>
          
          {/* Post-Generation Analysis */}
          {message.analysis && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 mb-1.5 text-primary font-black uppercase tracking-widest text-[9px]">
                <FileSearch className="h-3 w-3" />
                SQL Optimization Analysis
              </div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                <React.Suspense fallback={null}>
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
                              margin: "0.5em 0",
                              borderRadius: "6px",
                              fontSize: "10px",
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </Prism>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.analysis}
                  </ReactMarkdown>
                </React.Suspense>
              </div>
            </div>
          )}

          {message.explanation && (
            <div className="mt-2 pt-2 border-t border-border/50 text-[12px] text-muted-foreground italic">
              <React.Suspense fallback={null}>
                  <ReactMarkdown>{message.explanation}</ReactMarkdown>
              </React.Suspense>
            </div>
          )}
        </div>

        {/* SQL Code Block with Advanced Highlighting */}
        {message.sql && (
          <div className={cn(
            "w-full rounded-xl border shadow-2xl overflow-hidden group/sql transition-all hover:border-primary/50",
            isDark ? "bg-[#0a0c10] border-border/40" : "bg-white border-slate-200"
          )}>
            <div className={cn(
              "flex items-center justify-between px-3 py-1.5 border-b",
              isDark ? "bg-slate-900/50 border-white/5" : "bg-slate-100/50 border-slate-200"
            )}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>Synthesized SQL</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 transition-colors",
                  isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                )}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className={cn(
              "p-3 overflow-x-auto min-h-[2.5rem] border-t",
              isDark ? "bg-[#050505] border-white/5" : "bg-white border-slate-100"
            )}>
              <React.Suspense fallback={<div className="h-16 animate-pulse bg-muted/20" />}>
                <Prism 
                  language="sql" 
                  style={isDark ? vscDarkPlus : oneLight}
                  customStyle={{ 
                    background: 'transparent', 
                    padding: 0, 
                    margin: 0, 
                    fontSize: '11.5px', 
                    lineHeight: '1.5',
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace'
                  }}
                >
                  {message.sql}
                </Prism>
              </React.Suspense>
            </div>

            <div className={cn(
              "p-1.5 flex flex-col gap-1.5",
              isDark ? "bg-slate-900/30" : "bg-slate-50"
            )}>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  className={cn(
                    "h-7 text-[9px] font-bold uppercase tracking-widest transition-all",
                    isDark 
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white" 
                      : "border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  )}
                  onClick={() => onExplain(message.sql!)}
                >
                  <FileSearch className="h-3 w-3 mr-1.5" />
                  Explain
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-7 text-[9px] font-bold uppercase tracking-widest transition-all",
                    isDark 
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white" 
                      : "border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  )}
                  onClick={() => onOptimize(message.sql!)}
                >
                  <Wand2 className="h-3 w-3 mr-1.5" />
                  Optimize
                </Button>
              </div>

              <Button
                className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground border-none text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                onClick={() => onApply(message.sql!)}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Apply to Editor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
