/**
 * @file JsonTreeNode.tsx
 * @description Recursive component for rendering JSON objects as a tree with expandable nodes and masking for sensitive data.
 */

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonTreeNodeProps {
  name?: string;
  value: any;
  isLast?: boolean;
}

export function JsonTreeNode({
  name,
  value,
  isLast = true,
}: JsonTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderValue = () => {
    if (value === null) return <span className="text-[#d93025]">null</span>;
    if (typeof value === "boolean")
      return <span className="text-[#e67700]">{String(value)}</span>;
    if (typeof value === "number")
      return <span className="text-[#e67700]">{value}</span>;
    if (typeof value === "string") {
      // Mask password if key name suggests sensitive data
      const isSensitiveKey =
        name &&
        ["password", "token", "secret", "key"].includes(name.toLowerCase());
      if (isSensitiveKey) {
        return <span className="text-[#188339]">"********"</span>;
      }

      // Mask password in URI if detected
      const maskedValue = value.replace(/(:\/\/.*:)(.*)(@.*)/, "$1****$3");
      return <span className="text-[#188339]">"{maskedValue}"</span>;
    }
    return null;
  };

  if (!isObject) {
    return (
      <div className="flex items-start gap-1 py-0.5 px-4 hover:bg-muted/50 transition-colors group">
        {name && (
          <span className="text-[#1a73e8] font-bold shrink-0">{name}:</span>
        )}
        <span className="break-all">{renderValue()}</span>
        {!isLast && <span className="text-muted-foreground/40">,</span>}
      </div>
    );
  }

  const keys = Object.keys(value);
  const isEmpty = keys.length === 0;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-1 py-0.5 px-2 hover:bg-muted/50 rounded cursor-pointer transition-colors group"
        onClick={toggle}
      >
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {!isEmpty && (
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground/60 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          )}
        </div>
        {name && <span className="text-[#1a73e8] font-bold">{name}:</span>}
        <span className="text-muted-foreground/60 flex items-center gap-1.5">
          {isArray ? (
            <>
              <span className="text-foreground/40">[]</span>
              <span className="text-[10px] font-bold italic">
                {keys.length} item{keys.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <span className="text-foreground/40">{"{}"}</span>
              <span className="text-[10px] font-bold italic">
                {keys.length} key{keys.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </span>
      </div>

      {isExpanded && !isEmpty && (
        <div className="ml-5 border-l border-muted-foreground/10 flex flex-col">
          {keys.map((key, index) => (
            <JsonTreeNode
              key={key}
              name={isArray ? undefined : key}
              value={value[key]}
              isLast={index === keys.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
