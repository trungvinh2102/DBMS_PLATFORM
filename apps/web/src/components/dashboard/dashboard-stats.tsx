/**
 * @file apps/web/src/components/dashboard/dashboard-stats.tsx
 * @description Dashboard metrics component displaying connections, saved queries, and system health.
 */

"use client";

import { Activity, Database, FileCode } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStats() {
  // Fetch System Health
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  // Fetch Connections Count
  const { data: connections, isLoading: isLoadingConnections } = useQuery(
    trpc.database.listDatabases.queryOptions(),
  );

  // Fetch Saved Queries
  const { data: savedQueries, isLoading: isLoadingSavedQueries } = useQuery({
    ...trpc.database.listSavedQueries.queryOptions({}),
    retry: false,
  });

  const connectionsCount = connections?.length || 0;
  // @ts-ignore
  const savedQueriesCount = savedQueries?.length || 0;
  const isSystemHealthy = !!healthCheck.data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Active Connections */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Connections
          </CardTitle>
          <Database className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {isLoadingConnections ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold">{connectionsCount}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Active database connections
          </p>
        </CardContent>
      </Card>

      {/* Saved Queries */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saved Queries</CardTitle>
          <FileCode className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          {isLoadingSavedQueries ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-bold">{savedQueriesCount}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Queries saved in library
          </p>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          {healthCheck.isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  isSystemHealthy
                    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                    : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                }`}
              />
              <div className="text-2xl font-bold">
                {isSystemHealthy ? "Healthy" : "Issues"}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            API Service availability
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
