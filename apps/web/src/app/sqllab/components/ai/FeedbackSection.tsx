/**
 * @file FeedbackSection.tsx
 * @description Interactive feedback component (thumbs up/down) for AI responses.
 */

import React from "react";
import { ThumbsUp, ThumbsDown, Send, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackSectionProps {
  feedbackSubmitted: boolean;
  feedbackRating: 1 | -1 | null;
  showCorrection: boolean;
  correctionText: string;
  onRating: (rating: 1 | -1) => void;
  onCorrectionChange: (text: string) => void;
  onSubmitCorrection: () => void;
}

export const FeedbackSection = React.memo(({
  feedbackSubmitted,
  feedbackRating,
  showCorrection,
  correctionText,
  onRating,
  onCorrectionChange,
  onSubmitCorrection
}: FeedbackSectionProps) => (
  <div className="mt-2 animate-in fade-in duration-500">
    {!feedbackSubmitted ? (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest mr-1">Helpful?</span>
          <button
            type="button"
            onClick={() => onRating(1)}
            className={cn(
              "rounded-lg p-1.5 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              feedbackRating === 1
                ? "bg-emerald-500/20 text-emerald-500"
                : "hover:bg-emerald-500/10 text-muted-foreground/40 hover:text-emerald-500"
            )}
            aria-label="Mark assistant response as helpful"
            title="Good response"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRating(-1)}
            className={cn(
              "rounded-lg p-1.5 transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              feedbackRating === -1
                ? "bg-red-500/20 text-red-500"
                : "hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-500"
            )}
            aria-label="Mark assistant response as not helpful"
            title="Bad response"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {showCorrection && (
          <div className="flex gap-2 animate-in slide-in-from-top-1 duration-300">
            <input
              type="text"
              value={correctionText}
              onChange={(e) => onCorrectionChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmitCorrection()}
              placeholder="What was wrong? (optional)"
              className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30 focus:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/30"
              autoFocus
            />
            <button
              type="button"
              onClick={onSubmitCorrection}
              className="rounded-lg bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Submit assistant feedback"
              title="Submit feedback"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    ) : (
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest animate-in fade-in duration-300">
        <Check className="h-3 w-3 text-emerald-500" />
        Feedback recorded
      </div>
    )}
  </div>
));
