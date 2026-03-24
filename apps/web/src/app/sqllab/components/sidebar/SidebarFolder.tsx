/**
 * @file SidebarFolder.tsx
 * @description Sub-component for a collapsible folder in the SQL Lab sidebar (e.g., Tables, Views).
 */

import React from "react";
import { ChevronRight, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarFolderProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: string[] | undefined;
  count?: number;
  hasRefresh?: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  searchQuery: string;
  selectedItem: string | null;
  onToggle: (id: string) => void;
  onRefresh?: () => void;
  onSelectItem: (item: string) => void;
}

export function SidebarFolder({
  id,
  label,
  icon,
  items,
  count,
  hasRefresh,
  isExpanded,
  isLoading,
  searchQuery,
  selectedItem,
  onToggle,
  onRefresh,
  onSelectItem,
}: SidebarFolderProps) {
  return (
    <div className="flex flex-col">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onToggle(id);
          }
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group select-none",
          isExpanded ? "bg-muted/30" : "hover:bg-muted/20",
        )}
        onClick={() => onToggle(id)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 opacity-40 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
        )}
        <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
          <div className="text-foreground/60 shrink-0">{icon}</div>
          <span className="text-xs font-semibold tracking-tight text-foreground/80 truncate">
            {label}
          </span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] opacity-30 font-mono ml-auto mr-1">
              {count}
            </span>
          )}
        </div>
        {hasRefresh && isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh?.();
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <RefreshCw
              className={cn(
                "h-3 w-3 opacity-40",
                isLoading && "animate-spin opacity-100",
              )}
            />
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="flex flex-col border-l ml-4.5 mt-0.5 mb-1.5 pl-1.5 py-1 gap-px">
          {isLoading && id === "tables" ? (
            <div className="px-3 py-2 space-y-2 opacity-20">
              <div className="h-2 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          ) : items && items.length > 0 ? (
            items.map((item) => (
              <div
                key={item}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSelectItem(item);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded cursor-pointer text-[11px] font-medium transition-all flex items-center gap-2 group/item",
                  selectedItem === item
                    ? "bg-primary/10 text-primary font-bold shadow-sm"
                    : "text-muted-foreground/80 hover:bg-muted/30 hover:text-foreground",
                )}
                onClick={() => {
                  onSelectItem(item);
                }}
              >
                <div
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-all",
                    selectedItem === item
                      ? "opacity-100 scale-110 drop-shadow-sm"
                      : "opacity-70 grayscale-30",
                  )}
                >
                  {icon}
                </div>
                <span className="truncate">{item}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-[10px] italic opacity-30">
              {searchQuery
                ? "No results match search"
                : `No ${label.toLowerCase()} found`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
