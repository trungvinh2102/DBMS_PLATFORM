/**
 * @file ReasoningSection.tsx
 * @description Renders the AI's "thinking" process in a collapsible container.
 */

import React from "react";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningSectionProps {
  thought: string;
  showThought: boolean;
  onToggle: () => void;
  isDark: boolean;
  isGeneratingSQL: boolean;
}

export const ReasoningSection = ({ 
  thought, 
  showThought, 
  onToggle, 
  isDark,
  isGeneratingSQL 
}: ReasoningSectionProps) => (
  <div className="w-full mb-2">
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 transition-all py-1.5 px-3 rounded-full border w-fit group/thought shadow-sm",
        isDark 
          ? "bg-[#111419]/50 border-white/10 text-slate-400 hover:border-primary/40 hover:text-primary" 
          : "bg-white border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary"
      )}
    >
      <div className={cn(
        "p-1 rounded-md transition-all duration-500",
        showThought ? "rotate-180 text-primary" : "rotate-0 text-muted-foreground group-hover/thought:text-primary"
      )}>
        <BrainCircuit className="h-3.5 w-3.5" />
      </div>
      <span className="text-[10.5px] font-black uppercase tracking-widest group-hover/thought:text-primary transition-colors">
        {showThought ? "Hide Reasoning Process" : "View Reasoning Process"}
      </span>
      {isGeneratingSQL && (
        <div className="ml-2 flex items-center gap-1">
          <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-0" />
          <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-150" />
          <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-300" />
        </div>
      )}
    </button>

    <div className={cn(
      "grid transition-all duration-500 ease-in-out",
      showThought ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
    )}>
      <div className="overflow-hidden">
        <div className={cn(
          "p-4 rounded-2xl text-[11.5px] leading-relaxed font-mono ml-2 border",
          isDark ? "bg-[#111419]/80 border-white/5 text-muted-foreground" : "bg-slate-50 border-slate-200 text-slate-600 shadow-inner"
        )}>
          {thought}
        </div>
      </div>
    </div>
  </div>
);
