/**
 * @file SQLBlock.tsx
 * @description Syntax-highlighted SQL code block with interactive tools (copy, explain, optimize, apply).
 */

import React from "react";
import { Copy, Check, Sparkles, FileSearch, Wand2, ArrowRight } from "lucide-react";
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
}

export const SQLBlock = ({ 
  sql, 
  isDark, 
  onCopy, 
  copied, 
  onExplain, 
  onOptimize, 
  onApply 
}: SQLBlockProps) => (
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

    <div className={cn(
      "p-2 flex flex-col gap-2",
      isDark ? "bg-slate-900/40" : "bg-slate-50/50"
    )}>
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

      <Button
        className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground border-none text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 rounded-xl"
        onClick={() => onApply(sql)}
      >
        <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
        Apply to Editor
      </Button>
    </div>
  </div>
);
