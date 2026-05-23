/**
 * @file MarkdownRenderer.tsx
 * @description A memoized Markdown renderer tailored for AI Assistant messages,
 * supporting syntax highlighting and custom styling.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  isDark: boolean;
  role: "user" | "assistant";
  className?: string;
}

export const MarkdownRenderer = React.memo(({
  content,
  role,
  className
}: MarkdownRendererProps) => {
  const markdownComponents = useMemo(() => ({
    p({ children }: any) {
      return <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>;
    },
    ul({ children }: any) {
      return <ul className="my-1.5 list-disc space-y-0.5 pl-4">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="my-1.5 list-decimal space-y-0.5 pl-4">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="pl-1">{children}</li>;
    },
    h1({ children }: any) {
      return <h3 className="mb-1.5 mt-2 text-xs font-semibold first:mt-0">{children}</h3>;
    },
    h2({ children }: any) {
      return <h3 className="mb-1.5 mt-2 text-xs font-semibold first:mt-0">{children}</h3>;
    },
    h3({ children }: any) {
      return <h4 className="mb-1 mt-2 text-[12px] font-semibold first:mt-0">{children}</h4>;
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="my-2 border-l-2 border-primary/40 pl-2.5 text-muted-foreground">
          {children}
        </blockquote>
      );
    },
    a({ children, href }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {children}
        </a>
      );
    },
    table({ children }: any) {
      return (
        <div className="my-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-max border-collapse text-left text-[12px]">
            {children}
          </table>
        </div>
      );
    },
    th({ children }: any) {
      return <th className="border-b border-border bg-muted/40 px-2 py-1.5 font-semibold">{children}</th>;
    },
    td({ children }: any) {
      return <td className="border-b border-border/60 px-2 py-1.5 align-top last:border-b-0">{children}</td>;
    },
    pre({ children }: any) {
      return <>{children}</>;
    },
    code({ className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || "");
      return match ? (
        <pre
          className={cn(
            "my-2 max-h-72 overflow-auto rounded-lg border p-2.5 font-mono text-[11px] leading-5",
            role === "user"
              ? "border-white/15 bg-black/20 text-primary-foreground"
              : "border-border bg-muted/40 text-foreground"
          )}
        >
          <code className={cn("block min-w-max", codeClassName)} {...props}>
            {String(children).replace(/\n$/, "")}
          </code>
        </pre>
      ) : (
        <code className={cn(
          "rounded px-1.5 py-0.5 font-mono text-[11px]",
          role === "user" ? "bg-black/20" : "bg-black/5 dark:bg-white/10"
        )} {...props}>
          {children}
        </code>
      );
    },
  }), [role]);

  return (
    <div className={cn(
      "min-w-0 [overflow-wrap:anywhere]",
      role === "assistant"
        ? "max-w-none text-foreground/90"
        : "whitespace-pre-wrap break-words",
      className
    )}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
