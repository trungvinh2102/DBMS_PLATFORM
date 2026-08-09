/**
 * @file MarkdownRenderer.tsx
 * @description A memoized Markdown renderer tailored for AI Assistant messages,
 * supporting syntax highlighting and custom styling.
 */

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AS", "AND", "OR", "NOT", "INSERT", "INTO", "VALUES",
  "UPDATE", "SET", "DELETE", "CREATE", "ALTER", "DROP", "TABLE", "JOIN", "INNER", "LEFT",
  "RIGHT", "FULL", "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "DISTINCT", "UNION", "ALL", "NULL", "IS", "IN", "LIKE", "BETWEEN", "CASE", "WHEN",
  "THEN", "ELSE", "END", "WITH", "RETURNING", "PRIMARY", "KEY", "INDEX", "ASC", "DESC",
]);

function tokenizeSql(source: string, isLightUserSql: boolean) {
  const tokens: React.ReactNode[] = [];
  let index = 0;
  let textStart = 0;

  const pushText = (end: number) => {
    if (end > textStart) tokens.push(source.slice(textStart, end));
  };

  const pushToken = (end: number, className: string) => {
    pushText(index);
    tokens.push(<span key={`${className}-${index}`} className={className}>{source.slice(index, end)}</span>);
    index = end;
    textStart = end;
  };

  while (index < source.length) {
    if (source.startsWith("/*", index)) {
      const closeIndex = source.indexOf("*/", index + 2);
      pushToken(
        closeIndex === -1 ? source.length : closeIndex + 2,
        `sql-token-comment ${isLightUserSql ? "text-slate-600" : "text-muted-foreground"} italic`,
      );
      continue;
    }

    if (source.startsWith("--", index)) {
      const end = source.indexOf("\n", index);
      pushToken(
        end === -1 ? source.length : end,
        `sql-token-comment ${isLightUserSql ? "text-slate-600" : "text-muted-foreground"} italic`,
      );
      continue;
    }

    if (source[index] === "'") {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === "'" && source[end + 1] === "'") {
          end += 2;
        } else if (source[end] === "'") {
          end += 1;
          break;
        } else {
          end += 1;
        }
      }
      pushToken(
        end,
        `sql-token-string ${isLightUserSql ? "text-emerald-800" : "text-emerald-600 dark:text-emerald-400"}`,
      );
      continue;
    }

    const number = /^(?:\d+(?:\.\d+)?)/.exec(source.slice(index));
    if (number) {
      pushToken(
        index + number[0].length,
        `sql-token-number ${isLightUserSql ? "text-amber-800" : "text-amber-600 dark:text-amber-400"}`,
      );
      continue;
    }

    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index));
    if (word && SQL_KEYWORDS.has(word[0].toUpperCase())) {
      pushToken(
        index + word[0].length,
        `sql-token-keyword font-semibold ${isLightUserSql ? "text-indigo-800" : "text-sky-600 dark:text-sky-400"}`,
      );
      continue;
    }

    const operator = /^(?:<>|!=|<=|>=|=|<|>|\+|-|\*|\/|%)/.exec(source.slice(index));
    if (operator) {
      pushToken(
        index + operator[0].length,
        `sql-token-operator ${isLightUserSql ? "text-violet-800" : "text-violet-600 dark:text-violet-400"}`,
      );
      continue;
    }

    index += 1;
  }

  pushText(source.length);
  return tokens;
}

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
      const isSql = match?.[1].toLowerCase() === "sql";
      const isLightUserSql = role === "user" && !isDark && isSql;
      return match ? (
        <pre
          className={cn(
            "my-2 max-h-72 overflow-auto rounded-lg border p-2.5 font-mono text-[11px] leading-5",
            role === "user"
              ? isDark
                ? "border-white/15 bg-black/20 text-primary-foreground"
                : isSql
                  ? "border-indigo-200 bg-indigo-50 text-slate-900"
                  : "border-white/15 bg-black/20 text-primary-foreground"
              : "border-border bg-muted/40 text-foreground"
          )}
        >
          <code className={cn("block min-w-max", codeClassName)} {...props}>
            {isSql
              ? tokenizeSql(String(children).replace(/\n$/, ""), isLightUserSql)
              : String(children).replace(/\n$/, "")}
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
  }), [isDark, role]);

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
