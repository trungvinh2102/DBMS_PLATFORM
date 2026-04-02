/**
 * @file apps/web/src/components/dashboard/health-monitor.tsx
 * @description System health monitor tile with a pulsing green status indicator.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Server } from "lucide-react";
import { motion } from "motion/react";
import { databaseApi } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

export function HealthMonitor() {
  const { data: connections } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const activeDbId = connections?.[0]?.id || null;
  const { data: stats, isLoading: statsLoading } = useDashboardStats(activeDbId);

  const score = stats?.health.score || 0;
  const healthData = [{ value: score, fill: score > 80 ? "var(--color-primary)" : "#f59e0b" }];

  return (
    <motion.div
      className="col-span-1 md:col-span-1 glass-card p-4 flex flex-col items-center justify-center group h-full relative overflow-hidden"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Health</span>
      </div>

      <div className="h-32 w-full mt-4">
        {statsLoading ? (
           <Skeleton className="h-full w-full rounded-full bg-black/5" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              innerRadius="70%" 
              outerRadius="100%" 
              data={healthData} 
              startAngle={90} 
              endAngle={450}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background
                dataKey="value"
                cornerRadius={30}
                animationDuration={1500}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-2xl font-bold"
              >
                {score}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="text-center mt-2">
        <p className="text-[10px] font-medium text-primary uppercase tracking-tighter">
          {stats?.health.status || "Operational"}
        </p>
      </div>
    </motion.div>
  );
}
