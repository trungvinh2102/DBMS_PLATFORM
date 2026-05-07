/**
 * @file MarkdownRenderer.tsx
 * @description A memoized Markdown renderer tailored for AI Assistant messages,
 * supporting syntax highlighting and custom styling.
 */

import React, { Suspense, useMemo } from "react";
import { cn } from "@/lib/utils";

// Lazy-loaded heavy components
const ReactMarkdown = React.lazy(() => import('react-markdown'));
const Prism = React.lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })));

// Prism Styles
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import oneLight from 'react-syntax-highlighter/dist/cjs/styles/prism/one-light';

interface MarkdownRendererProps {
  content: string;
  isDark: boolean;
  role: "user" | "assistant";
  className?: string;
}

export const MarkdownRenderer = React.memo(({
  content,
  isDark,
  role,
  className
}: MarkdownRendererProps) => {
  const markdownComponents = useMemo(() => ({
    code({ node, className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || "");
      return match ? (
        <Suspense fallback={<div className="h-20 w-full animate-pulse bg-muted/10 rounded-lg" />}>
          <Prism
            style={isDark ? vscDarkPlus : oneLight}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: "0.8em 0",
              borderRadius: "10px",
              fontSize: "10px",
              background: role === "user"
                ? "rgba(0,0,0,0.2)"
                : isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
              border: role === "user" ? "1px solid rgba(255,255,255,0.1)" : "none",
            }}
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </Prism>
        </Suspense>
      ) : (
        <code className={cn(
          "px-1.5 py-0.5 rounded font-mono text-[10px]",
          role === "user" ? "bg-black/20" : "bg-black/5 dark:bg-white/10"
        )} {...props}>
          {children}
        </code>
      );
    },
  }), [isDark, role]);

  return (
    <div className={cn(
      role === "assistant" ? "prose prose-sm dark:prose-invert max-w-none" : "whitespace-pre-wrap",
      className
    )}>
      <Suspense fallback={null}>
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
