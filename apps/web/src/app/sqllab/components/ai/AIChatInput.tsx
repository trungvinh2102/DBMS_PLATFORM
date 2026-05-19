/**
 * @file AIChatInput.tsx
 * @description Input area for the AI Assistant, including slash command support and model selection.
 */

import React from "react";
import { BrainCircuit, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { type SlashCommand } from "../../utils/slash-commands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIRuntimeStatus } from "./types";

export const AUTO_MODEL_VALUE = "__auto__";

interface AIModelOption {
  name: string;
  modelId: string;
  provider?: string;
}

interface AIChatInputProps {
  input: string;
  onInputChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  selectedModel: string;
  onModelChange: (val: string) => void;
  availableModels: AIModelOption[];
  runtimeStatus?: AIRuntimeStatus | null;
  onSend: () => void;
  showCommandMenu: boolean;
  commandMenuIndex: number;
  commandOptions?: SlashCommand[];
  onCommandSelect: (cmd: SlashCommand) => void;
}

const AIChatInputComponent = ({
  input,
  onInputChange,
  onKeyDown,
  isTyping,
  selectedModel,
  onModelChange,
  availableModels,
  runtimeStatus,
  onSend,
  showCommandMenu,
  commandMenuIndex,
  commandOptions,
  onCommandSelect
}: AIChatInputProps) => {
  const hasAnyKey = runtimeStatus?.hasApiKey ?? true;
  const providerHasKey = (provider?: string) => {
    if (!provider || !runtimeStatus?.providers) return true;
    return runtimeStatus.providers[provider.toLowerCase()]?.hasApiKey ?? true;
  };

  return (
    <div className="border-t border-border/70 bg-muted/10 p-3 backdrop-blur-3xl md:p-4">
      <div className="flex w-full flex-col gap-3">
        <div className="relative rounded-xl border border-border/70 bg-background shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
          <SlashCommandMenu
            inputValue={input}
            onSelect={onCommandSelect}
            visible={showCommandMenu}
            activeIndex={commandMenuIndex}
            commands={commandOptions}
          />

          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={showCommandMenu ? "Type a command..." : "Describe the query, chart, or analysis you need..."}
            className="min-h-28 w-full resize-none border-none bg-transparent p-4 text-sm leading-6 focus-visible:ring-0"
          />

          <div className="flex flex-col gap-3 border-t border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <BrainCircuit className="h-3.5 w-3.5 text-primary/70" />
              <Select value={selectedModel || AUTO_MODEL_VALUE} onValueChange={(val) => val && onModelChange(val)}>
                <SelectTrigger className="h-8 min-w-36 justify-between rounded-lg border-border/70 bg-muted/50 px-3 text-[10px] font-black uppercase tracking-widest shadow-none hover:bg-muted focus:ring-0">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value={AUTO_MODEL_VALUE} disabled={!hasAnyKey} className="text-[10px] font-bold uppercase tracking-wider">
                    Auto Provider
                  </SelectItem>
                  {availableModels.map(m => (
                    <SelectItem
                      key={m.modelId}
                      value={m.modelId}
                      disabled={!providerHasKey(m.provider)}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {m.name}{m.provider ? ` / ${m.provider}` : ""}
                    </SelectItem>
                  ))}
                  {availableModels.length === 0 && (
                    <SelectItem value="gpt-4o-mini" disabled={!hasAnyKey} className="text-[10px] font-bold uppercase tracking-wider">
                      GPT-4o mini
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              className={cn(
                "h-9 rounded-lg px-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                input.trim() ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              onClick={onSend}
              disabled={isTyping || !input.trim()}
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AIChatInput = React.memo(AIChatInputComponent);
AIChatInput.displayName = "AIChatInput";
