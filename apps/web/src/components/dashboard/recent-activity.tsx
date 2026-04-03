/**
 * @file apps/web/src/components/dashboard/recent-activity.tsx
 * @description List of recent queries styled for the Asymmetric Bento Grid.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Search, Compass } from "lucide-react";
import { motion } from "motion/react";

import { databaseApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RecentActivity() {
  const { user } = useAuth();

  const { data: connectionsData } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
    enabled: !!user,
  });
  const connections = connectionsData as any[] | undefined;

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["queryHistory", "recent"],
    queryFn: () => databaseApi.getHistory(),
    enabled: !!user,
  });


  const recentQueries = (historyData as any[])?.slice(0, 5) || [];

  return (
    <motion.div
      className="col-span-1 md:col-span-3 glass-card p-6 flex flex-col h-full"
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h2>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/5" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full bg-black/5 dark:bg-white/5" />
                  <Skeleton className="h-3 w-1/3 bg-black/5 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : recentQueries.length > 0 ? (
          <div className="space-y-1">
            {recentQueries.map((item: any, i: number) => (
              <div
                key={item.id}
                className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-primary border-b border-black/5 dark:border-white/5 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Search className="h-3 w-3 text-primary" />
                    </div>
                    <code className="text-sm font-mono truncate text-foreground/90 font-medium">
                      {item.sql.replace(/\n/g, " ").substring(0, 70)}
                      {item.sql.length > 70 && "..."}
                    </code>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-1">
                    {formatDistanceToNow(new Date(item.executedAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center gap-3 pl-9">
                  {item.databaseId && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 rounded-sm font-normal border-black/10 dark:border-white/10 text-muted-foreground bg-black/5 dark:bg-black/20">
                      {connections?.find((c: any) => c.id === item.databaseId)?.databaseName || "DB"}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground/70">
                    <span className="font-mono">{item.executionTime ?? 0}</span>ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-40 text-muted-foreground/50">
            <Compass className="h-10 w-10 mb-3 stroke-1 text-primary/40" />
            <p className="text-sm font-medium text-foreground/70 mb-1">No Activity Found</p>
            <p className="text-xs text-center max-w-[200px] mb-4">
              Queries you execute in the SQL Lab will appear here.
            </p>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10">
              <Link to="/sqllab">Launch SQL Lab</Link>
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
