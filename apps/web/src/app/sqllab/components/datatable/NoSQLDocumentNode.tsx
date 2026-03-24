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
}

export function NoSQLDocumentNode({
  data,
  label,
  index,
  isRoot = false,
  searchTerm = "",
}: NoSQLDocumentNodeProps) {
  const [isOpen, setIsOpen] = useState(isRoot && (index === 0 || !!searchTerm));
  const isObject = data !== null && typeof data === "object";
  const type = Array.isArray(data) ? "array" : typeof data;

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
    setIsOpen(!isOpen);
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Document copied to clipboard");
  };

  const renderValue = () => {
    if (data === null)
      return (
        <span className="text-pink-600 dark:text-pink-500 font-mono italic">
          null
        </span>
      );
    if (type === "string")
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
          "{data}"
        </span>
      );
    if (type === "number")
      return (
        <span className="text-amber-600 dark:text-amber-400 font-mono">
          {data}
        </span>
      );
    if (type === "boolean")
      return (
        <span className="text-blue-600 dark:text-blue-400 font-mono">
          {data.toString()}
        </span>
      );
    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        isRoot
          ? "mb-4 border border-border bg-muted/10 rounded-lg shadow-sm p-2"
          : "ml-4 border-l border-border",
      )}
    >
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded hover:bg-muted/50 transition-colors cursor-pointer group",
          isRoot && "bg-muted/30 mb-1",
        )}
        onClick={isObject ? toggle : undefined}
      >
        {isObject ? (
          isOpen ? (
            <ChevronDown className="h-3 w-3 mr-1 text-muted-foreground/60" />
          ) : (
            <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground/60" />
          )
        ) : (
          <div className="w-4" />
        )}

        {label && (
          <span className="text-muted-foreground font-mono text-xs mr-2">
            {label}:
          </span>
        )}

        {!isObject ? (
          <div className="flex-1 flex items-center justify-between">
            {renderValue()}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">
              {Array.isArray(data)
                ? `Array [${data.length}]`
                : `Object {${Object.keys(data).length}}`}
            </span>
            {isRoot && (
              <button
                onClick={copyToClipboard}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all text-muted-foreground/60"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {isObject && isOpen && (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
          {Object.entries(data).map(([key, val], idx) => (
            <NoSQLDocumentNode
              key={key}
              label={key}
              data={val}
              index={idx}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
