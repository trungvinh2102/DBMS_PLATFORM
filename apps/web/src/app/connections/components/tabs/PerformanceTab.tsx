/**
 * @file PerformanceTab.tsx
 * @description Performance tuning and resource management for database connections.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Database, Zap, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerformanceTabProps {
  pooling: {
    pool_size: number;
    max_overflow: number;
    pool_timeout: number;
    pool_recycle: number;
  };
  onChange: (field: string, value: number) => void;
}

export function PerformanceTab({ pooling, onChange }: PerformanceTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-8">
        {/* Core Pooling */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-sm">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Core Pooling</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Manage permanent connections</p>
            </div>
          </div>

          <div className="space-y-6 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Pool Size</Label>
                <div className="h-7 px-2 border border-border font-bold text-xs flex items-center justify-center rounded bg-background shadow-xs">
                  {pooling.pool_size}
                </div>
              </div>
              <Slider 
                value={pooling.pool_size} 
                min={1} 
                max={50} 
                step={1} 
                onValueChange={(val) => onChange("pool_size", val[0])}
              />
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Number of connections to keep open. Default is 5. High values increase memory usage on the DB server.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Max Overflow</Label>
                <div className="h-7 px-2 border border-border font-bold text-xs flex items-center justify-center rounded bg-background shadow-xs">
                  {pooling.max_overflow}
                </div>
              </div>
              <Slider 
                value={pooling.max_overflow} 
                min={0} 
                max={50} 
                step={1} 
                onValueChange={(val) => onChange("max_overflow", val[0])}
              />
              <p className="text-[9px] text-muted-foreground italic">Burst capacity for handling high-load spikes.</p>
            </div>
          </div>
        </div>

        {/* Timing & Recycling */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 shadow-sm">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Timeouts & Recycling</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Cleanup stale connections</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Pool Timeout (s)</Label>
                <Zap className="h-3 w-3 text-muted-foreground" />
              </div>
              <Input 
                type="number" 
                value={pooling.pool_timeout} 
                onChange={(e) => onChange("pool_timeout", parseInt(e.target.value) || 0)} 
                className="h-9 bg-background border-border/50 text-xs font-bold"
              />
              <p className="text-[9px] text-muted-foreground">Wait time before throwing a NoAvailableConnection error.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Recycle Interval (s)</Label>
                <Activity className="h-3 w-3 text-muted-foreground" />
              </div>
              <Input 
                type="number" 
                value={pooling.pool_recycle} 
                onChange={(e) => onChange("pool_recycle", parseInt(e.target.value) || 0)} 
                className="h-9 bg-background border-border/50 text-xs font-bold"
              />
              <p className="text-[9px] text-muted-foreground">Force re-connection after this period (useful for preventing idle kill).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Performance Options */}
      <div className="p-6 bg-gradient-to-r from-muted/5 via-muted/10 to-muted/5 border border-border/40 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] bg-background">BETA</Badge>
                  <h4 className="text-xs font-bold font-mono">Statement Level Caching (SQL Alchemy)</h4>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
              When enabled, compiled SQL statements will be cached to reduce overhead. This significantly improves performance for repetitive queries in high-load scenarios.
          </p>
      </div>
    </div>
  );
}
