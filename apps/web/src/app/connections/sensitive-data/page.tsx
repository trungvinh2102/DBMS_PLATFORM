/**
 * @file page.tsx
 * @description Main page for Sensitive Data management.
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Loader2,
  Database as DbIcon,
  Search,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { sensitiveDataApi, databaseApi, roleApi } from "@/lib/api-client";
import type {
  SensitiveResource,
  SensitivePolicy,
} from "@/lib/sensitive-data-types";
import { SensitiveResourceTable } from "./components/SensitiveResourceTable";
import { SensitivePolicyTable } from "./components/SensitivePolicyTable";
import { AddResourceDialog } from "./components/AddResourceDialog";
import { AddPolicyDialog } from "./components/AddPolicyDialog";

export default function SensitiveDataPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resources");
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] =
    useState<SensitiveResource | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<SensitivePolicy | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: resources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ["sensitive-resources"],
    queryFn: () => sensitiveDataApi.listResources(),
  });

  const { data: policies = [], isLoading: isLoadingPolicies } = useQuery({
    queryKey: ["sensitive-policies"],
    queryFn: () => sensitiveDataApi.listPolicies(),
  });

  const { data: databases = [] } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  // Mutations
  const createResourceMutation = useMutation({
    mutationFn: sensitiveDataApi.createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-resources"] });
      toast.success("Sensitive resource created successfully");
    },
    onError: (error: any) =>
      toast.error(`Failed to create resource: ${error.message}`),
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SensitiveResource>;
    }) => sensitiveDataApi.updateResource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-resources"] });
      toast.success("Sensitive resource updated");
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: sensitiveDataApi.deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-resources"] });
      toast.success("Resource deleted");
    },
  });

  const createPolicyMutation = useMutation({
    mutationFn: sensitiveDataApi.createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-policies"] });
      toast.success("Policy created successfully");
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SensitivePolicy>;
    }) => sensitiveDataApi.updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-policies"] });
      toast.success("Policy updated");
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: sensitiveDataApi.deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-policies"] });
      toast.success("Policy removed");
    },
  });

  // Handlers
  const handleAddResource = () => {
    setSelectedResource(null);
    setIsResourceDialogOpen(true);
  };

  const handleEditResource = (resource: SensitiveResource) => {
    setSelectedResource(resource);
    setIsResourceDialogOpen(true);
  };

  const handleAddPolicy = () => {
    setSelectedPolicy(null);
    setIsPolicyDialogOpen(true);
  };

  const handleEditPolicy = (policy: SensitivePolicy) => {
    setSelectedPolicy(policy);
    setIsPolicyDialogOpen(true);
  };

  const handleResourceSubmit = (data: any) => {
    if (selectedResource) {
      updateResourceMutation.mutate({ id: selectedResource.id, data });
    } else {
      createResourceMutation.mutate(data);
    }
  };

  const handlePolicySubmit = (data: any) => {
    if (selectedPolicy) {
      updatePolicyMutation.mutate({ id: selectedPolicy.id, data });
    } else {
      createPolicyMutation.mutate(data);
    }
  };

  const filteredResources = resources.filter(
    (r) =>
      r.resource_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredPolicies = policies.filter((p) => {
    const resource = resources.find((r) => r.id === p.resource_id);
    return (
      resource?.resource_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      p.privilege_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black p-6 space-y-6 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Sensitive Data Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Discover, classify, and protect sensitive information across your
            databases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={
              activeTab === "resources" ? handleAddResource : handleAddPolicy
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "resources" ? "Add Resource" : "Add Policy"}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-black">
        <CardHeader className="pb-3 px-6">
          <div className="flex items-center justify-between">
            <Tabs
              defaultValue="resources"
              className="w-full"
              onValueChange={setActiveTab}
            >
              <div className="flex items-center justify-between w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border-none">
                  <TabsTrigger
                    value="resources"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                  >
                    Resources
                  </TabsTrigger>
                  <TabsTrigger
                    value="policies"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                  >
                    Policies
                  </TabsTrigger>
                </TabsList>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 bg-slate-50 dark:bg-slate-900 border-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <TabsContent value="resources" className="mt-6">
                {isLoadingResources ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <SensitiveResourceTable
                    resources={filteredResources}
                    onEdit={handleEditResource}
                    onDelete={(id) => deleteResourceMutation.mutate(id)}
                  />
                )}
              </TabsContent>

              <TabsContent value="policies" className="mt-6">
                {isLoadingPolicies ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <SensitivePolicyTable
                    policies={filteredPolicies}
                    onEdit={handleEditPolicy}
                    onDelete={(id) => deletePolicyMutation.mutate(id)}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      <AddResourceDialog
        open={isResourceDialogOpen}
        onOpenChange={setIsResourceDialogOpen}
        onSubmit={handleResourceSubmit}
        resource={selectedResource}
        databases={databases.map((db) => ({
          id: db.id,
          name: db.databaseName,
        }))}
      />

      <AddPolicyDialog
        open={isPolicyDialogOpen}
        onOpenChange={setIsPolicyDialogOpen}
        onSubmit={handlePolicySubmit}
        policy={selectedPolicy}
        resources={resources}
        roles={roles}
      />
    </div>
  );
}
