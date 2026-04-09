/**
 * @file AIAssistantHeader.tsx
 * @description Header component for the AI Assistant sidebar.
 */

import React from "react";
import { Zap, X, History, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIAssistantHeaderProps {
  showHistory: boolean;
  onToggleHistory: () => void;
  onNewChat: () => void;
  onClose: () => void;
}

export const AIAssistantHeader = ({
  showHistory,
  onToggleHistory,
  onNewChat,
  onClose
}: AIAssistantHeaderProps) => (
  <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 font-black uppercase tracking-tighter text-primary">
        <Zap className="h-4 w-4 fill-primary/20" />
        <span className="text-sm">AI Assistant</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleHistory}
        className={cn("h-8 w-8 rounded-full", showHistory && "bg-primary/10 text-primary")}
      >
        {showHistory ? <MessageSquare className="h-4 w-4" /> : <History className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNewChat}
        className="h-8 w-8 rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
      <X className="h-4 w-4" />
    </Button>
  </div>
);
