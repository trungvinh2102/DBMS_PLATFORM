/**
 * @file GeneralSettings.tsx
 * @description Immersive General settings with premium visual theme selection and accessibility features.
 */

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Palette, 
  Languages, 
  Eye, 
  Zap, 
  Monitor, 
  Sun, 
  Moon, 
  Sparkle,
  Dna,
  Wind,
  Layers,
  Info
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GeneralSettingsProps {
  theme: string;
  onThemeChange: (theme: string | null) => void;
}

export function GeneralSettings({
  theme,
  onThemeChange,
}: GeneralSettingsProps) {

  // Simple Theme Card component
  const ThemeCard = ({ value, label, icon: Icon, description, active }: any) => (
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

  return (
    <TooltipProvider delay={200}>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
          
          {/* Theme Galaxy Section */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 shadow-sm border border-indigo-500/20 group-hover/card:scale-110 transition-transform">
                  <Palette className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    App Aesthetics
                  </CardTitle>
                  <CardDescription>
                    Choose the visual soul of your workspace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ThemeCard 
                  value="light" 
                  label="Light" 
                  icon={Sun} 
                  description="Classic Day" 
                  active={theme === "light"} 
                />
                <ThemeCard 
                  value="dark" 
                  label="Dark" 
                  icon={Moon} 
                  description="Immersive Night" 
                  active={theme === "dark"} 
                />
                <ThemeCard 
                  value="system" 
                  label="System" 
                  icon={Monitor} 
                  description="Auto-Adapter" 
                  active={theme === "system"} 
                />
              </div>

              <div className="p-4 rounded-3xl bg-muted/20 border border-border/40 flex items-center justify-between group/item hover:bg-indigo-500/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-background border border-border/40 shadow-sm transition-transform group-hover/item:scale-105">
                    <Sparkle className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-tight">Dynamic Color Injection</div>
                    <div className="text-[11px] text-muted-foreground">Adjust app accent colors based on your system.</div>
                  </div>
                </div>
                <Switch checked disabled />
              </div>
            </CardContent>
          </Card>

          {/* Language & Local Grid */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 shadow-sm border border-emerald-500/20 group-hover/card:scale-110 transition-transform">
                  <Languages className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Locale & Language
                  </CardTitle>
                  <CardDescription>
                    The app currently supports English and Vietnamese.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Active Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="bg-muted/20 border-border/40 h-12 rounded-2xl focus:ring-emerald-500/40">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🇺🇸</span>
                        <SelectValue placeholder="English" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <span className="text-md">🇺🇸</span> English (Standard)
                        </div>
                      </SelectItem>
                      <SelectItem value="vi">
                        <div className="flex items-center gap-2 opacity-60">
                          <span className="text-md">🇻🇳</span> Tiếng Việt (Beta)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 opacity-60 pointer-events-none">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Region Settings</Label>
                  <div className="h-12 border-2 border-dashed border-border/30 rounded-2xl flex items-center justify-center text-[11px] text-muted-foreground italic tracking-tight">
                    Currency & Timezone Auto-detection
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Comfort Section (Accessibility) */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-orange-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 shadow-sm border border-rose-500/20 group-hover/card:scale-110 transition-transform">
                  <Eye className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Visual Comfort & Performance
                  </CardTitle>
                  <CardDescription>
                    Optimize the interface for accessibility and hardware compatibility.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reduced Motion Switch */}
                <div className="p-4 rounded-3xl bg-muted/20 border border-border/40 flex items-center justify-between transition-all hover:bg-rose-500/5 group/access">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-background border border-border/40 shadow-sm transition-transform group-hover/access:scale-110">
                      <Wind className="h-4 w-4 text-rose-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-tight flex items-center gap-2">
                        Reduced Motion
                        <Tooltip>
                          <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground cursor-help" />} />
                          <TooltipContent>Disables heavy animations like parallax and bouncing.</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">
                        ACCESSIBILITY A11Y
                      </div>
                    </div>
                  </div>
                  <Switch checked={false} onCheckedChange={() => {}} />
                </div>

                {/* Glassmorphism Logic Switch */}
                <div className="p-4 rounded-3xl bg-muted/20 border border-border/40 flex items-center justify-between transition-all hover:bg-rose-500/5 group/access">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-background border border-border/40 shadow-sm transition-transform group-hover/access:scale-110">
                      <Layers className="h-4 w-4 text-rose-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-tight">Enable Blur Effects</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1 text-emerald-500">
                        PREMIUM GLASS
                      </div>
                    </div>
                  </div>
                  <Switch checked={true} onCheckedChange={() => {}} />
                </div>
              </div>

              <div className="p-4 rounded-3xl border-2 border-dashed border-border/30 bg-muted/5 flex items-center justify-center gap-4 text-xs text-muted-foreground group hover:border-rose-500/30 transition-all">
                <Dna className="h-4 w-4 opacity-40 group-hover:rotate-180 transition-transform duration-1000" />
                <span>AI is currently optimizing your interface density based on your display resolution.</span>
                <Select disabled defaultValue="relaxed">
                  <SelectTrigger className="w-32 h-8 rounded-full border-none bg-background/50 shadow-sm text-[10px] font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="relaxed">Relaxed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
