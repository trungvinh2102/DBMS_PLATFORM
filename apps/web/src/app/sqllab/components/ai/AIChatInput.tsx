/**
 * @file AIChatInput.tsx
 * @description Input area for the AI Assistant, including slash command support and model selection.
 */

import React from "react";
import { Send, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { filterCommands, type SlashCommand } from "../../utils/slash-commands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AIChatInputProps {
  input: string;
  onInputChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  selectedModel: string;
  onModelChange: (val: string) => void;
  availableModels: any[];
  onSend: () => void;
  showCommandMenu: boolean;
  commandMenuIndex: number;
  onCommandSelect: (cmd: SlashCommand) => void;
}

export const AIChatInput = ({
  input,
  onInputChange,
  onKeyDown,
  isTyping,
  selectedModel,
  onModelChange,
  availableModels,
  onSend,
  showCommandMenu,
  commandMenuIndex,
  onCommandSelect
}: AIChatInputProps) => (
  <div className="p-4 border-t border-border bg-muted/10 backdrop-blur-3xl">
    <div className="flex flex-col gap-3">
      <div className="relative group bg-background/50 rounded-2xl border border-border/50 focus-within:border-primary/50 transition-all p-2 shadow-inner">
        {/* Slash Command Autocomplete Menu */}
        <SlashCommandMenu
          inputValue={input}
          onSelect={onCommandSelect}
          visible={showCommandMenu}
          activeIndex={commandMenuIndex}
        />

          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={showCommandMenu ? 'Type a command...' : 'Ask anything or type / for commands...'}
            className="min-h-20 w-full border-none bg-transparent focus-visible:ring-0 resize-none text-sm p-2"
          />

          <div className="flex items-center justify-between mt-2 px-1 pb-1">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-3.5 w-3.5 text-primary/70" />
              <Select value={selectedModel} onValueChange={(val) => val && onModelChange(val)}>
                <SelectTrigger className="border-none bg-muted/50 hover:bg-muted h-7 px-3 focus:ring-0 text-[10px] font-black uppercase tracking-widest min-w-30 justify-between shadow-none rounded-lg">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent className="glass border-border/50">
                {availableModels.map(m => (
                  <SelectItem key={m.modelId} value={m.modelId} className="text-[10px] font-bold uppercase tracking-wider">
                    {m.name}
                  </SelectItem>
                ))}
                {availableModels.length === 0 && (
                  <SelectItem value="gemini-1.5-flash" className="text-[10px] font-bold uppercase tracking-wider">
                    Gemini 1.5 Flash
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            className={cn(
              "h-8 px-4 rounded-lg transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest",
              input.trim() ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            onClick={onSend}
            disabled={isTyping || !input.trim()}
          >
            <Send className="h-3.5 w-3.5 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  </div>
);
