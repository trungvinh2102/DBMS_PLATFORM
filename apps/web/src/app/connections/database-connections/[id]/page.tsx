/**
 * @file page.tsx
 * @description Detail page for a specific database connection.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { databaseApi } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { ConnectionConfig } from "../components/ConnectionConfig";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { DataSource } from "@/lib/types";

export default function ConnectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data: connections, isFetching } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const activeConn = connections?.find((conn: DataSource) => conn.id === id);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!activeConn) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full space-y-4">
        <div className="text-xl font-semibold">Connection not found</div>
        <button
          onClick={() => router.push("/connections/database-connections")}
          className="text-blue-500 hover:underline"
        >
          Back to Connections
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-slate-200 dark:border-border flex items-center px-6 shrink-0 bg-white dark:bg-background">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => router.push("/connections/database-connections")}
                className="cursor-pointer font-medium hover:text-blue-600 dark:hover:text-blue-400"
              >
                Connections
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-slate-900 dark:text-slate-100">
                {activeConn.databaseName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <ConnectionConfig
          activeConn={activeConn}
          onBack={() => router.push("/connections/database-connections")}
        />
      </div>
    </div>
  );
}
