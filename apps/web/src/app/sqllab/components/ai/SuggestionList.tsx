/**
 * @file SuggestionList.tsx
 * @description Renders a list of interactive suggestions for the user to continue the conversation.
 */

import React from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { AISuggestion } from "./types";

interface SuggestionListProps {
  suggestions: AISuggestion[];
  onSuggestionClick: (suggestion: string) => void;
}

export const SuggestionList = React.memo(({
  suggestions,
  onSuggestionClick
}: SuggestionListProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSuggestionClick(suggestion.prompt)}
          className={cn(
            "group/sug inline-flex max-w-full items-start gap-1.5 rounded-md border border-border/80 bg-muted/20 px-2.5 py-1.5",
            "text-left text-[11px] font-medium leading-4 text-muted-foreground transition-colors",
            "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
          aria-label={`Ask: ${suggestion.prompt}`}
          title={suggestion.prompt}
        >
          <span className="min-w-0 break-words">{suggestion.label}</span>
          <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 opacity-60 transition-opacity group-hover/sug:opacity-100" />
        </button>
      ))}
    </div>
  );
});

SuggestionList.displayName = "SuggestionList";
