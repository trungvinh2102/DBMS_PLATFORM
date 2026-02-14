/**
 * @file AccessControlPage.tsx
 * @description Centralized registry view for Database Access Control.
 * Displays resource access and managing roles.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { databaseApi, roleApi, privilegeApi } from "@/lib/api-client";
import type { RolePrivilege, DataSource, Role } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useState } from "react";
import { RoleManagementTab } from "./components/RoleManagementTab";

export default function AccessControlPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("resources");

  // 1. Fetch Data
  const { data: databases, isLoading: isLoadingDbs } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  const { data: allPrivileges, isLoading: isLoadingPrivs } = useQuery({
    queryKey: ["allDatabasePrivileges"],
    queryFn: () => privilegeApi.listByResource("DATABASE"),
  });

  if (isLoadingDbs || isLoadingRoles || isLoadingPrivs) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 2. Process Data for Resource View
  // Map<DatabaseID, Set<RoleID>>
  const dbAccessMap = new Map<string, Set<string>>();
  allPrivileges?.forEach((rp) => {
    if (rp.resourceId) {
      const roleSet = dbAccessMap.get(rp.resourceId) || new Set();
      roleSet.add(rp.roleId);
      dbAccessMap.set(rp.resourceId, roleSet);
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-background/50 p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/connections">Connections</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Access Control</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Access Control Registry
          </h1>
          <p className="text-muted-foreground">
            Centralized overview of database access permissions across the
            organization.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Action buttons if needed, currently empty as Manage Roles is now a tab */}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="resources" className="gap-2">
            <Database className="h-4 w-4" />
            By Resource
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <UserCog className="h-4 w-4" />
            By Role
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {databases?.map((db) => {
              const assignedRoles = dbAccessMap.get(db.id) || new Set();
              return (
                <Card
                  key={db.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/connections/database-connections/${db.id}`)
                  }
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {db.databaseName}
                    </CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {assignedRoles.size}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Roles with access
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {Array.from(assignedRoles)
                        .slice(0, 3)
                        .map((rid) => {
                          const r = roles?.find((role) => role.id === rid);
                          return (
                            <Badge
                              key={rid}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {r?.name}
                            </Badge>
                          );
                        })}
                      {assignedRoles.size > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{assignedRoles.size - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
