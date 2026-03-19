/**
 * @file QueryPerformanceCard.tsx
 * @description Card for configuring query limits and performance-related switches.
 */

import { Database, Hash, Info, Zap, Clock, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface QueryPerformanceCardProps {
  settings: any;
  updateData: (data: any) => void;
}

export function QueryPerformanceCard({ settings, updateData }: QueryPerformanceCardProps) {
  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 shadow-sm border border-blue-500/20 group-hover/card:scale-110 transition-transform">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Query Performance
              </CardTitle>
              <CardDescription>
                Configure how the engine handles data fetching and limits.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-500 border-blue-500/20 font-bold uppercase tracking-tighter">
            Optimization Level: High
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4 text-blue-500/70" />
                Default Query Limit
                <Tooltip>
                  <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-blue-500" />} />
                  <TooltipContent>Prevents huge queries from hanging the UI by capping the result set.</TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-xs text-muted-foreground">
                Maximum number of rows to fetch in the SQL Lab by default.
              </p>
            </div>
            <Badge variant="secondary" className="px-3 py-1 font-mono text-blue-500 bg-blue-500/5 border-blue-500/10 shadow-inner">
              <Zap className="h-3 w-3 mr-1.5 inline animate-pulse" />
              {settings.defaultQueryLimit} rows
            </Badge>
          </div>
          <Slider
            value={[settings.defaultQueryLimit]}
            min={10}
            max={5000}
            step={10}
            onValueChange={(val: any) => updateData({ defaultQueryLimit: Array.isArray(val) ? val[0] : val })}
            className="py-4"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">
            <span>Fast (10)</span>
            <span>Optimal (1k)</span>
            <span>Bulk (5k)</span>
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-blue-500/30 transition-all hover:bg-blue-500/5 group">
            <div className="space-y-1">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500/70 group-hover:rotate-12 transition-transform" />
                Hard Timeout (30s)
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatic abort for queries exceeding threshold.
              </p>
            </div>
            <Switch 
              checked={settings.queryTimeout} 
              onCheckedChange={(c: boolean) => updateData({ queryTimeout: !!c })} 
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-green-500/30 transition-all hover:bg-green-500/5 group">
            <div className="space-y-1">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500/70 group-hover:scale-110 transition-transform" />
                Auto-Explain
              </Label>
              <p className="text-xs text-muted-foreground">
                Generate execution plans for every query.
              </p>
            </div>
            <Switch 
              checked={settings.autoExplain} 
              onCheckedChange={(c: boolean) => updateData({ autoExplain: !!c })} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
