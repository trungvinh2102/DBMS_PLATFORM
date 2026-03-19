/**
 * @file ThemeCard.tsx
 * @description Interactive theme selection card with visual feedback and decorative elements.
 */

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  value: string;
  label: string;
  icon: LucideIcon;
  description: string;
  active: boolean;
  onThemeChange: (theme: string) => void;
}

export function ThemeCard({ 
  value, 
  label, 
  icon: Icon, 
  description, 
  active, 
  onThemeChange 
}: ThemeCardProps) {
  return (
    <button
      onClick={() => onThemeChange(value)}
      className={cn(
        "relative flex flex-col p-4 rounded-3xl border-2 transition-all duration-300 group overflow-hidden",
        "hover:scale-[1.02] active:scale-[0.98]",
        active 
          ? "border-primary bg-primary/5 shadow-premium shadow-primary/10" 
          : "border-border/40 bg-card hover:border-border hover:bg-muted/30"
      )}
    >
      <div className={cn(
        "flex items-center justify-center p-3 rounded-2xl mb-4 transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-sm font-bold tracking-tight mb-1">{label}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
        {description}
      </div>
      
      {/* Decorative gradient background for cards */}
      <div className={cn(
        "absolute -right-4 -bottom-4 w-20 h-20 blur-3xl rounded-full opacity-20 pointer-events-none transition-opacity",
        value === "light" ? "bg-amber-500" : value === "dark" ? "bg-indigo-500" : "bg-purple-500",
        active ? "opacity-40" : "group-hover:opacity-30"
      )} />

      {/* Selected Indicator */}
      {active && (
        <div className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </div>
      )}
    </button>
  );
}
