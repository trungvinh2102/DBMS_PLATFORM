/**
 * @file ConfidenceBadge.tsx
 * @description A small, pill-shaped badge indicating the AI's confidence level.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
}

export const ConfidenceBadge = ({ score }: ConfidenceBadgeProps) => (
  <div className={cn(
    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border",
    score >= 4 
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
      : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
  )}>
    <Sparkles className="h-2.5 w-2.5" />
    {score * 20}% Confidence
  </div>
);
