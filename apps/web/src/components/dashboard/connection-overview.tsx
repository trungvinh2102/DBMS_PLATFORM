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
    {value: 20}, {value: 30}, {value: 25}, {value: 40}, {value: 35}, {value: 45}
  ];

  return (
    <motion.div
      className="col-span-1 md:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col justify-between group h-full relative overflow-hidden"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Background Sparkline - Refined as a bottom-aligned area chart */}
      <div className="absolute bottom-0 left-0 w-full h-[30%] -z-10 opacity-30 pointer-events-none">
         <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
             <defs>
               <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                 <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
               </linearGradient>
             </defs>
             <Area 
               type="monotone" 
               dataKey="value" 
               stroke="var(--color-primary)" 
               strokeWidth={2} 
               fill="url(#colorTrend)"
               dot={false}
               animationDuration={2000}
             />
           </AreaChart>
         </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium tracking-tight">Connections</h2>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Database className="h-4 w-4 text-primary" />
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-2 mt-auto">
          <Skeleton className="h-12 w-24 bg-black/5 dark:bg-white/5" />
          <Skeleton className="h-4 w-32 bg-black/5 dark:bg-white/5" />
        </div>
      ) : count === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <Database className="h-10 w-10 text-muted-foreground/30 stroke-1" />
          <div>
            <p className="text-sm font-medium mb-1">No connections yet</p>
            <p className="text-xs text-muted-foreground mb-3">Connect your first database to get started.</p>
          </div>
          <Button 
            asChild 
            size="sm" 
            variant="default"
            className="w-full shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Link to="/connections" className="flex items-center justify-center">
              <Plus className="mr-2 h-4 w-4" /> Add Connection
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-auto relative z-10">
          <div className="flex items-baseline gap-2 mb-1">
            <div className="text-7xl font-black tracking-tighter text-foreground drop-shadow-sm">
              <AnimatedCounter value={count} />
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-bold text-primary uppercase tracking-widest">Total</span>
               <span className="text-xs font-medium text-muted-foreground uppercase leading-none">Databases</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <p className="text-sm font-medium flex items-center gap-2 text-foreground/80">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              {stats?.connections?.current || 0} Live Sessions
            </p>
            <div className="h-4 w-px bg-border" />
            <p className="text-xs text-muted-foreground">
              {stats?.connections?.current ? "Healthy Traffic" : "Standing By"}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
