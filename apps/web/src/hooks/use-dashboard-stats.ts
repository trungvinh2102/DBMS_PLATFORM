/**
 * @file use-dashboard-stats.ts
 * @description Hook for fetching live database dashboard statistics.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// Standardize the shape for our Recharts widgets
export interface DashboardStatsPerformance {
  time: string;
  avg_latency: number;
  total_queries: number;
  cpu?: number;
  memory?: number;
  tps?: number;
}

export interface DashboardStats {
  health: {
    score: number;
    status: string;
  };
  connections: {
    current: number;
    max: number;
    trend: number[];
  };
  performance: DashboardStatsPerformance[];
  status_counts?: Array<{
    status: string;
    count: number;
  }>;
  storage: {
    used_gb: number;
    free_gb: number;
    total_gb: number;
  };
  top_slow_queries: Array<{
    sql: string;
    exec_ms: number;
    count: number;
  }>;
  ai_summary: string;
}

export function useDashboardStats(dbId: string | null) {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", dbId],
    queryFn: async () => {
      if (!dbId) throw new Error("No database selected");
      const response = await api.get("database/dashboard/stats", {
        params: { db_id: dbId }
      });
      return response as unknown as DashboardStats;
    },
    enabled: !!dbId,
    refetchInterval: 30000, // Refresh every 30s
    retry: 2,
    staleTime: 10000,
  });
}
