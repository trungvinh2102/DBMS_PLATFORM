/**
 * @file apps/web/src/components/dashboard/connection-overview.tsx
 * @description Connection overview component displaying the total databases with animated sparkline trend.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

import { databaseApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data.length) return null;
  const w = 200;
  const h = 60;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function ConnectionOverview() {
  const { user } = useAuth();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const activeDbId = connections?.[0]?.id || null;
  const { data: stats } = useDashboardStats(activeDbId);

  const count = connections?.length || 0;
  const trendData = stats?.connections?.trend.map((v: number) => ({ value: v })) || [
    { value: 20 }, { value: 30 }, { value: 25 }, { value: 40 }, { value: 35 }, { value: 45 }
  ];

  return (
    <motion.div
      className="col-span-1 md:col-span-3 lg:col-span-2 bento-card p-6 flex flex-col justify-between group h-full relative overflow-hidden group/conn border-none bg-linear-to-br from-background via-card to-muted/20 shadow-premium"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Visual background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover/conn:bg-primary/10 transition-colors duration-500" />

      {/* Background Sparkline - pure SVG (no recharts) */}
      <Sparkline data={trendData.map(d => d.value)} className="absolute bottom-0 left-0 w-full h-[40%] -z-10 opacity-20 pointer-events-none group-hover/conn:opacity-30 transition-opacity duration-1000" />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover/conn:scale-110 transition-transform duration-500">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/80">Connectivity</h2>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Global Status: Active</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 mt-auto">
          <Skeleton className="h-16 w-32 bg-muted/50 rounded-xl" />
          <Skeleton className="h-4 w-48 bg-muted/50 rounded-lg" />
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 relative z-10 bg-background/40 backdrop-blur-md rounded-2xl border border-border/10 p-6">
          <div className="relative">
            <Database className="h-12 w-12 text-muted-foreground/20 stroke-1" />
            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
          </div>
          <div>
            <p className="text-base font-bold mb-1">Architecture Pending</p>
            <p className="text-xs text-muted-foreground mb-6">Initialize your first analytical pipeline by connecting a data source.</p>
            <Button
              asChild
              size="sm"
              variant="default"
              className="w-full shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all font-black uppercase tracking-widest h-11"
            >
              <Link to="/connections" className="flex items-center justify-center">
                <Plus className="mr-2 h-4 w-4" /> Add Asset
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-auto relative z-10">
          <div className="flex items-baseline gap-4 mb-4">
            <div className="text-8xl font-black tracking-tighter text-foreground drop-shadow-xl select-none">
              {count}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase leading-none opacity-60">Connections</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-border/10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold flex items-center gap-2.5 text-foreground/80">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-30"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                {connections.length} Active Connections
              </p>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
