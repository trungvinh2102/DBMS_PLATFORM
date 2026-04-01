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

export function HealthMonitor() {
  const { data: healthCheck, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: () => databaseApi.health(),
  });

  const isHealthy = !!healthCheck;

  return (
    <motion.div
      className="col-span-1 md:col-span-2 glass-card p-6 flex flex-col justify-between group"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground flex items-center gap-2">
          <Server className="h-4 w-4" /> System Core
        </h2>
        {isLoading ? (
          <Skeleton className="h-4 w-4 rounded-full bg-black/10 dark:bg-white/10" />
        ) : (
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`h-3 w-3 rounded-full ${
              isHealthy ? "bg-green-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]"
            }`}
          />
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
             <Skeleton className="h-8 w-24 bg-black/5 dark:bg-white/5" />
             <Skeleton className="h-3 w-32 bg-black/5 dark:bg-white/5" />
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground mb-1 flex items-center gap-2">
              <Activity className={`h-5 w-5 ${isHealthy ? 'text-green-400' : 'text-red-400'}`} />
              {isHealthy ? "Operational" : "Degraded"}
            </div>
            <p className="text-xs text-muted-foreground">
              API services are responding normally.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
