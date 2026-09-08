/**
 * @file NoSQLDocumentNode.tsx
 * @description Recursive component for rendering NoSQL (JSON) documents as expandable nodes with search highlighting.
 */

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NoSQLDocumentNodeProps {
  data: any;
  label?: string;
  index?: number;
  isRoot?: boolean;
  searchTerm?: string;
  expandAllSignal?: { expanded: boolean; id: number } | null;
}

export function NoSQLDocumentNode({
  data,
  label,
  index,
  isRoot = false,
  searchTerm = "",
  expandAllSignal,
}: NoSQLDocumentNodeProps) {
  const isObject = data !== null && typeof data === "object";
  const type = Array.isArray(data) ? "array" : typeof data;

  // Open first 5 root documents on initial load, or when searching, or inherit from active expandAllSignal
  const [isOpen, setIsOpen] = useState(
    expandAllSignal
      ? expandAllSignal.expanded
      : isRoot
        ? (index ?? 0) < 5 || Boolean(searchTerm)
        : false,
  );

  // Synchronize with toolbar Expand all / Collapse all signal
  useEffect(() => {
    if (expandAllSignal) {
      setIsOpen(expandAllSignal.expanded);
    }
  }, [expandAllSignal]);

  // Auto-expand if search term matches children
  useEffect(() => {
    if (searchTerm && isObject) {
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes(searchTerm.toLowerCase())) {
        setIsOpen(true);
      }
    }
  }, [searchTerm, data, isObject]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
    toast.success("Document copied to clipboard");
  };

  const copyFieldValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy =
      typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
    navigator.clipboard?.writeText(textToCopy);
    toast.success("Copied to clipboard");
  };

  const renderValue = () => {
    if (data === undefined) {
      return (
        <span className="text-muted-foreground/40 italic font-mono text-xs">
          undefined
        </span>
      );
    }
    if (data === null) {
      return (
        <span className="text-pink-600 dark:text-pink-400 font-mono italic text-xs">
          null
        </span>
      );
    }
    if (type === "string") {
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs break-all">
          "{data}"
        </span>
      );
    }
    if (type === "number") {
      return (
        <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
          {data}
        </span>
      );
    }
    if (type === "boolean") {
      return (
        <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">
          {data.toString()}
        </span>
      );
    }
    return null;
  };

  const isArray = Array.isArray(data);
  const keys = isObject ? Object.keys(data) : [];
  const summary = isArray
    ? `[${data.length} ${data.length === 1 ? "item" : "items"}]`
    : `{${keys.length} ${keys.length === 1 ? "key" : "keys"}}`;

  return (
    <div
      className={cn(
        "flex flex-col select-text font-mono text-xs leading-snug",
        isRoot
          ? "mb-3 border border-border bg-card/60 rounded-lg shadow-xs p-2 transition-colors"
          : "ml-4 border-l border-border/60 pl-1",
      )}
    >
      {isObject ? (
        <div
          className={cn(
            "flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 transition-colors group select-text",
            isRoot && "bg-muted/30 mb-1",
          )}
        >
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={
              isRoot
                ? `Document ${(index ?? 0) + 1}`
                : label
                  ? `${label} ${summary}`
                  : summary
            }
            onClick={toggle}
            className="flex-1 min-w-0 flex items-center text-left py-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 shrink-0" />
            )}

            {isRoot ? (
              <span className="font-semibold text-foreground/85 text-xs mr-2 font-mono shrink-0">
                Document {(index ?? 0) + 1}
              </span>
            ) : label ? (
              <span className="text-muted-foreground font-mono text-xs mr-2 shrink-0">
                {label}:
              </span>
            ) : null}

            <span className="text-muted-foreground/60 text-xs font-mono truncate">
              {summary}
            </span>
          </button>

          {isRoot && (
            <button
              type="button"
              aria-label="Copy document"
              title="Copy document JSON"
              onClick={copyToClipboard}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 hover:bg-muted rounded transition-all text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0 ml-2 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center py-0.5 px-2 rounded hover:bg-muted/40 transition-colors group select-text text-xs leading-snug">
          <div className="w-4 shrink-0" />
          {label && (
            <span className="text-muted-foreground font-mono text-xs mr-2 shrink-0">
              {label}:
            </span>
          )}
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <div className="truncate">{renderValue()}</div>
            <button
              type="button"
              aria-label={`Copy ${label ?? "value"}`}
              title={`Copy ${label ?? "value"}`}
              onClick={copyFieldValue}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-0.5 hover:bg-muted rounded transition-all text-muted-foreground/40 hover:text-foreground shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      {isObject && isOpen && (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
          {isArray
            ? data.map((item: any, idx: number) => (
                <NoSQLDocumentNode
                  key={idx}
                  label={String(idx)}
                  data={item}
                  index={idx}
                  searchTerm={searchTerm}
                  expandAllSignal={expandAllSignal}
                />
              ))
            : Object.entries(data).map(([key, val], idx) => (
                <NoSQLDocumentNode
                  key={key}
                  label={key}
                  data={val}
                  index={idx}
                  searchTerm={searchTerm}
                  expandAllSignal={expandAllSignal}
                />
              ))}
        </div>
      )}
    </div>
  );
}
