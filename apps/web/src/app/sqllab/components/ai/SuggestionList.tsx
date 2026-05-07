/**
 * @file SuggestionList.tsx
 * @description Renders a list of interactive suggestions for the user to continue the conversation.
 */

import React from "react";
import { ArrowRight } from "lucide-react";

interface SuggestionListProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const SuggestionList = React.memo(({
  suggestions,
  onSuggestionClick
}: SuggestionListProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-700">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSuggestionClick(suggestion)}
          className="px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-[10px] font-medium text-primary transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group/sug"
        >
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse group-hover/sug:animate-bounce" />
          {suggestion}
          <ArrowRight className="h-2.5 w-2.5 opacity-0 -translate-x-1 group-hover/sug:opacity-100 group-hover/sug:translate-x-0 transition-all" />
        </button>
      ))}
    </div>
  );
});

SuggestionList.displayName = "SuggestionList";
