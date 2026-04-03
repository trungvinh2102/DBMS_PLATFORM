/**
 * @file apps/web/src/components/dashboard/connection-overview.tsx
 * @description Connection overview component displaying the total databases with animated sparkline trend.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

import { databaseApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    let totalDuration = 800;
    let incrementTime = Math.max((totalDuration / end), 10);

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{value === 0 ? 0 : count}</span>;
}

export function ConnectionOverview() {
  const { user } = useAuth();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
    enabled: !!user,
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

      {/* Background Sparkline - Enhanced area chart */}
      <div className="absolute bottom-0 left-0 w-full h-[40%] -z-10 opacity-20 pointer-events-none group-hover/conn:opacity-30 transition-opacity duration-1000">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#colorTrend)"
              dot={false}
              animationDuration={3000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

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
              <AnimatedCounter value={count} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase leading-none opacity-60">Connections</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-border/10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold flex items-center gap-2.5 text-foreground/80">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
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
