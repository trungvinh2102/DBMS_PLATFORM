/**
 * @file ProblemsList.tsx
 * @description Logic for displaying syntax errors and warnings in SQLLab.
 */

import { XCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function getSeverityIcon(severity: number) {
  switch (severity) {
    case 8:
      return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    case 4:
      return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />;
    case 2:
      return <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5 text-gray-500 shrink-0" />;
  }
}

export function getSeverityClass(severity: number) {
  switch (severity) {
    case 8:
      return "text-red-500 bg-red-500/5 hover:bg-red-500/10";
    case 4:
      return "text-yellow-600 bg-yellow-500/5 hover:bg-yellow-500/10";
    case 2:
      return "text-blue-500 bg-blue-500/5 hover:bg-blue-500/10";
    default:
      return "text-gray-500 bg-gray-500/5 hover:bg-gray-500/10";
  }
}

interface ProblemsListProps {
  errors: any[];
  onItemClick?: (line: number, column: number) => void;
}

export function ProblemsList({ errors, onItemClick }: ProblemsListProps) {
  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20 p-12 text-center">
        <AlertCircle className="h-12 w-12 mb-6" />
        <p className="text-sm font-black uppercase tracking-widest">
          No Problems
        </p>
        <p className="text-xs mt-2 font-medium text-green-500/60">
          ✓ Your SQL syntax is valid
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {errors.map((err) => (
        <div
          key={err.id}
          onClick={() => onItemClick?.(err.line, err.column)}
          className={cn(
            "flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors",
            getSeverityClass(err.severity),
          )}
        >
          {getSeverityIcon(err.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/70">
                [{err.line}:{err.column}]
              </span>
              <span className="text-xs font-medium truncate">
                {err.message}
              </span>
            </div>
          </div>
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
              err.severity === 8
                ? "bg-red-500/10 text-red-500"
                : err.severity === 4
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-blue-500/10 text-blue-500",
            )}
          >
            {err.severityLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
