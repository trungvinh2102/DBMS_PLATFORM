/**
 * @file apps/web/src/components/dashboard/connection-overview.tsx
 * @description Connection overview component displaying the total databases with animated counting.
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

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    
    let totalDuration = 800;
    let incrementTime = (totalDuration / end) || 10;
    
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
  const { token } = useAuth();
  
  const { data: connections, isLoading } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
    enabled: !!token,
  });

  const count = connections?.length || 0;

  return (
    <motion.div
      className="col-span-1 md:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col justify-between group h-full"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
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
          <Button asChild size="sm" className="w-full bg-primary hover:bg-primary/90">
            <Link to="/connections">
              <Plus className="mr-2 h-4 w-4" /> Add Connection
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-auto">
          <div className="text-5xl font-bold tracking-tight mb-2">
            <AnimatedCounter value={count} />
          </div>
          <p className="text-sm text-primary flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Active Workspaces
          </p>
        </div>
      )}
    </motion.div>
  );
}
