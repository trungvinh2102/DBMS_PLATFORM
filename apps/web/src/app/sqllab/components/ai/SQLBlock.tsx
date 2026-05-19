/**
 * @file SQLBlock.tsx
 * @description Syntax-highlighted SQL code block with interactive tools for copy, explain, and optimize actions.
 */

import React, { useMemo, useState } from "react";
import { Copy, Check, Sparkles, FileSearch, Wand2, GitCompare, Play, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fixed: Use CJS version to avoid resolution issues
import vscDarkPlus from 'react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus';
import oneLight from 'react-syntax-highlighter/dist/cjs/styles/prism/one-light';

const Prism = React.lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })));

interface SQLBlockProps {
  sql: string;
  isDark: boolean;
  onCopy: () => void;
  copied: boolean;
  onExplain: (sql: string) => void;
  onOptimize: (sql: string) => void;
  onApply: (sql: string) => void;
  onPreview: (sql: string) => void;
  currentSql?: string;
}

export const SQLBlock = React.memo(({
  sql,
  isDark,
  onCopy,
  copied,
  onExplain,
  onOptimize,
  onApply,
  onPreview,
  currentSql = "",
}: SQLBlockProps) => {
  const [showDiff, setShowDiff] = useState(false);
  const hasEditorSql = currentSql.trim().length > 0;
  const diffStats = useMemo(() => summarizeSqlDiff(currentSql, sql), [currentSql, sql]);

  return (
    <div className={cn(
      "w-full rounded-2xl border shadow-lg overflow-hidden group/sql transition-all hover:border-primary/30",
      isDark ? "bg-[#0d1117] border-white/10" : "bg-white border-slate-200"
    )}>
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b",
        isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            isDark ? "text-slate-400" : "text-slate-500"
          )}>Synthesized SQL</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 transition-colors rounded-lg",
            isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-200"
          )}
          onClick={onCopy}
          title={copied ? "Copied" : "Copy SQL"}
          aria-label={copied ? "Copied SQL" : "Copy SQL"}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className={cn(
        "p-4 overflow-x-auto min-h-10 border-t-0",
        isDark ? "bg-[#0d1117]" : "bg-white"
      )}>
        <React.Suspense fallback={<div className="h-16 animate-pulse bg-muted/20" />}>
          <Prism
            language="sql"
            style={isDark ? vscDarkPlus : oneLight}
            customStyle={{
              background: 'transparent',
              padding: 0,
              margin: 0,
              fontSize: '11px',
              lineHeight: '1.6',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace'
            }}
          >
            {sql}
          </Prism>
        </React.Suspense>
      </div>

      {showDiff && (
        <div className={cn("grid gap-2 border-t p-2 md:grid-cols-2", isDark ? "border-white/10" : "border-slate-200")}>
          <DiffPane title="Editor" sql={currentSql || "-- empty editor"} isDark={isDark} />
          <DiffPane title={`AI +${diffStats.added} / -${diffStats.removed}`} sql={sql} isDark={isDark} />
        </div>
      )}

      <div className={cn(
        "p-2 flex flex-col gap-2",
        isDark ? "bg-slate-900/40" : "bg-slate-50/50"
      )}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <Button
            variant="outline"
            className="h-8 rounded-xl text-[9px] font-bold uppercase tracking-widest"
            onClick={() => onApply(sql)}
          >
            <PenLine className="h-3.5 w-3.5 mr-1.5" />
            Apply
          </Button>
          <Button
            variant="outline"
            className="h-8 rounded-xl text-[9px] font-bold uppercase tracking-widest"
            onClick={() => onPreview(sql)}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
          <Button
            variant="ghost"
            className="h-8 rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-primary/5 hover:text-primary dark:text-slate-300"
            onClick={() => setShowDiff((current) => !current)}
            disabled={!hasEditorSql}
          >
            <GitCompare className="h-3.5 w-3.5 mr-1.5" />
            Diff
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            className="h-8 text-[9px] font-bold uppercase tracking-widest transition-all text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl"
            onClick={() => onExplain(sql)}
          >
            <FileSearch className="h-3.5 w-3.5 mr-1.5" />
            Explain
          </Button>
          <Button
            variant="outline"
            className={cn(
              "h-8 text-[9px] font-bold uppercase tracking-widest transition-all rounded-xl",
              isDark
                ? "border-white/10 bg-white/5 hover:bg-transparent text-slate-300 hover:text-white hover:border-primary/50"
                : "border-slate-200 bg-white hover:bg-transparent hover:border-primary/40 text-slate-600 hover:text-slate-900"
            )}
            onClick={() => onOptimize(sql)}
          >
            <Wand2 className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
            Optimize
          </Button>
        </div>

      </div>
    </div>
  );
});

function DiffPane({ title, sql, isDark }: { title: string; sql: string; isDark: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-lg border", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}>
      <div className="border-b border-border/60 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <pre className="max-h-44 overflow-auto p-2 text-[10px] leading-5 text-muted-foreground">
        <code>{sql}</code>
      </pre>
    </div>
  );
}

function summarizeSqlDiff(before: string, after: string) {
  const beforeLines = new Set(before.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const afterLines = new Set(after.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  let added = 0;
  let removed = 0;
  afterLines.forEach((line) => {
    if (!beforeLines.has(line)) added += 1;
  });
  beforeLines.forEach((line) => {
    if (!afterLines.has(line)) removed += 1;
  });
  return { added, removed };
}
