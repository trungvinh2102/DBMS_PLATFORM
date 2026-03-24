/**
 * @file ResultFooter.tsx
 * @description Footer component for the SQL Lab results panel, displaying cursor position, encoding, and error status.
 */

import React from "react";
import { Database, XCircle, AlertTriangle } from "lucide-react";

interface ResultFooterProps {
  cursorPos: { lineNumber: number; column: number };
  tabSize: number;
  errorCount: number;
  warningCount: number;
  setActiveTab: (tab: any) => void;
  encoding?: string;
}

export function ResultFooter({
  cursorPos,
  tabSize,
  errorCount,
  warningCount,
  setActiveTab,
  encoding = "UTF-8",
}: ResultFooterProps) {
  return (
    <footer className="h-10 border-t bg-background flex items-center justify-between px-5 text-[10px] font-black text-muted-foreground/60 overflow-hidden shrink-0 uppercase tracking-widest divide-x divide-border/40">
      <div className="flex items-center gap-8 h-full">
        <span className="flex items-center gap-2.5 hover:bg-muted px-4 cursor-pointer transition-colors h-full">
          <Database className="h-4 w-4 text-primary/60" /> {encoding}
        </span>
        <span className="hover:bg-muted px-4 cursor-pointer transition-colors h-full flex items-center">
          LN {cursorPos.lineNumber}, COL {cursorPos.column}
        </span>
        <span className="hover:bg-muted px-4 cursor-pointer transition-colors h-full flex items-center">
          SPACES: {tabSize}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-end h-full gap-8">
        {(errorCount > 0 || warningCount > 0) && (
          <button
            onClick={() => setActiveTab("problems")}
            className="flex items-center gap-2 hover:bg-muted px-4 cursor-pointer transition-colors h-full"
          >
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" />
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </span>
            )}
          </button>
        )}
        <div className="flex items-center gap-3 hover:bg-muted px-5 cursor-pointer transition-colors h-full">
          <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(0,0,0,0.2)] dark:shadow-[0_0_12px_rgba(255,255,255,0.2)]" />
          ASIA/HO_CHI_MINH (GMT+07:00)
        </div>
      </div>
    </footer>
  );
}
