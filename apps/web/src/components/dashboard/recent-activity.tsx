/**
 * @file apps/web/src/components/dashboard/recent-activity.tsx
 * @description Component displaying a list of recent database queries and interactions.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Database, LayoutDashboard, Search } from "lucide-react";

import { trpc } from "@/utils/trpc";
import type { RouterOutputs } from "@/utils/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type QueryHistoryData = RouterOutputs["database"]["getQueryHistory"];
type HistoryItem = QueryHistoryData[number];
type DatabaseList = RouterOutputs["database"]["listDatabases"];
type DatabaseItem = DatabaseList[number];

export function RecentActivity() {
  // Fetch Connections for metadata lookup (database name)
  const { data: connectionsData } = useQuery(
    trpc.database.listDatabases.queryOptions(),
  );
  const connections = connectionsData as DatabaseList | undefined;

  // Fetch Recent Query History (Limit 5)
  const { data: historyData, isLoading: isLoadingHistory } = useQuery(
    trpc.database.getQueryHistory.queryOptions({ limit: 5 }),
  );

  const recentQueries = historyData as QueryHistoryData | undefined;

  return (
    <Card className="col-span-4 shadow-sm flex flex-col h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Your latest executed queries and interactions
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-87.5 pr-4 -mr-4">
          {isLoadingHistory ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentQueries && recentQueries.length > 0 ? (
            <div className="space-y-1">
              {recentQueries.map((item: HistoryItem) => (
                <div
                  key={item.id}
                  className="group flex flex-col gap-1 p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Search className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium truncate text-foreground/90">
                        {item.sql.replace(/\n/g, " ").substring(0, 60)}
                        {item.sql.length > 60 && "..."}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(item.executedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pl-8">
                    {item.databaseId && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-5 px-1.5 rounded-sm font-normal bg-muted text-muted-foreground border-transparent"
                      >
                        <Database className="h-3 w-3 mr-1 opacity-70" />
                        {connections?.find(
                          (c: DatabaseItem) => c.id === item.databaseId,
                        )?.name || "Unknown DB"}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      Duration:{" "}
                      <span className="font-mono">
                        {item.executionTime ?? 0}ms
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-50 text-muted-foreground/50">
              <LayoutDashboard className="h-12 w-12 mb-3 stroke-1" />
              <p className="text-sm font-medium text-muted-foreground">
                No recent activity
              </p>
              <p className="text-xs text-center max-w-50 mt-1">
                Execute queries in SQL Lab to see them appear here.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
