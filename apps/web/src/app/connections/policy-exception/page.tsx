/**
 * @file page.tsx
 * @description Policy exception management for database access rules.
 */

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Plus, Loader2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { policyExceptionApi } from "@/lib/api-client";
import type { PolicyException } from "@/lib/policy-exception-types";
import { PolicyExceptionTable } from "./components/PolicyExceptionTable";
import { RequestExceptionDialog } from "./components/RequestExceptionDialog";
import { ExceptionDetailsDialog } from "./components/ExceptionDetailsDialog";
import { useAuth } from "@/hooks/use-auth";

export default function PolicyExceptionPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("ADMIN") || false;

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedException, setSelectedException] =
    useState<PolicyException | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Queries
  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ["policy-exceptions"],
    queryFn: () => policyExceptionApi.list(),
  });

  // Mutations
  const requestMutation = useMutation({
    mutationFn: policyExceptionApi.request,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-exceptions"] });
      toast.success("Policy exception request submitted");
    },
    onError: (error: any) => toast.error(`Request failed: ${error.message}`),
  });

  const approveMutation = useMutation({
    mutationFn: policyExceptionApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-exceptions"] });
      toast.success("Exception approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      policyExceptionApi.reject(id, "Rejected by admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-exceptions"] });
      toast.error("Exception rejected");
    },
  });

  const filteredExceptions = exceptions.filter((e) => {
    const matchesSearch =
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.purpose.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black p-6 space-y-6 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-blue-600" />
            Policy Exceptions
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage temporary policy overrides and emergency access requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsRequestDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Request Exception
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by ID, subject, or purpose..."
            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val || "ALL")}
          >
            <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="REVOKED">Revoked</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-black">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <PolicyExceptionTable
              exceptions={filteredExceptions}
              onView={(e) => {
                setSelectedException(e);
                setIsDetailsDialogOpen(true);
              }}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      <RequestExceptionDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        onSubmit={(data) => requestMutation.mutate(data)}
      />

      <ExceptionDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        exception={selectedException}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id) => rejectMutation.mutate(id)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
