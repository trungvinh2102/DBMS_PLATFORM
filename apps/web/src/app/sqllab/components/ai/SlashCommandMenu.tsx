/**
 * @file SlashCommandMenu.tsx
 * @description Floating autocomplete dropdown for slash commands in the AI Assistant chat input.
 * Appears when the user types "/" and filters commands in real-time.
 */

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { type SlashCommand, filterCommands } from "../../utils/slash-commands";

interface SlashCommandMenuProps {
  /** Current value of the chat input */
  inputValue: string;
  /** Callback when a command is selected */
  onSelect: (command: SlashCommand) => void;
  /** Whether the menu should be visible */
  visible: boolean;
  /** Active index (managed by parent for keyboard nav) */
  activeIndex?: number;
}

export function SlashCommandMenu({ inputValue, onSelect, visible, activeIndex = 0 }: SlashCommandMenuProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const filteredCommands = filterCommands(inputValue);

  // Scroll active item into view when activeIndex changes
  useEffect(() => {
    if (visible && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex, visible]);

  if (!visible || filteredCommands.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="mx-2 rounded-xl border border-border bg-background shadow-2xl shadow-black/20 overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
              Quick Commands
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <kbd className="px-1.5 py-0.5 text-[8px] rounded border border-border/50 bg-muted/50 font-mono text-muted-foreground/60">↑↓</kbd>
              <span className="text-[8px] text-muted-foreground/40">navigate</span>
              <kbd className="px-1.5 py-0.5 text-[8px] rounded border border-border/50 bg-muted/50 font-mono text-muted-foreground/60 ml-1">↵</kbd>
              <span className="text-[8px] text-muted-foreground/40">select</span>
              <kbd className="px-1.5 py-0.5 text-[8px] rounded border border-border/50 bg-muted/50 font-mono text-muted-foreground/60 ml-1">Esc</kbd>
              <span className="text-[8px] text-muted-foreground/40">dismiss</span>
            </div>
          </div>
        </div>

        {/* Command List */}
        <div 
          ref={scrollContainerRef}
          className="max-h-[240px] overflow-y-auto py-1 scroll-smooth"
        >
          {filteredCommands.map((cmd, index) => {
            const Icon = cmd.icon;
            const isActive = index === activeIndex;
            return (
              <button
                key={cmd.command}
                onClick={() => onSelect(cmd)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground/50"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[11px] font-black tracking-wide",
                      isActive ? "text-primary" : "text-foreground/80"
                    )}>
                      {cmd.command}
                    </span>
                    {cmd.acceptsArgs && cmd.argsHint && (
                      <span className="text-[9px] text-muted-foreground/40 font-mono">
                        {cmd.argsHint}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                    {cmd.description}
                  </p>
                </div>
                {isActive && (
                  <div className="flex-shrink-0 text-[8px] text-primary/50 font-bold uppercase tracking-widest">
                    Enter ↵
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
