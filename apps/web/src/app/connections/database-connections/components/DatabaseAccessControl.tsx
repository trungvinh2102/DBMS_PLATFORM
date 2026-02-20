/**
 * @file DatabaseAccessControl.tsx
 * @description Component for managing resource-level access control for databases.
 * Allows assigning and managing role privileges for a specific database connection.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleApi, privilegeApi } from "@/lib/api-client";
import type {
  DataSource,
  Role,
  RolePrivilege,
  PrivilegeType,
} from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Shield, Trash } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface DatabaseAccessControlProps {
  activeConn: DataSource;
}

export function DatabaseAccessControl({
  activeConn,
}: DatabaseAccessControlProps) {
  const queryClient = useQueryClient();
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // 1. Fetch all Roles
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  // 2. Fetch all Privilege Types
  const { data: privilegeTypes } = useQuery({
    queryKey: ["privilegeTypes"],
    queryFn: () => privilegeApi.listTypes(),
  });

  // 3. Fetch existing privileges for this RESOURCE
  const { data: rolePrivileges, isLoading } = useQuery({
    queryKey: ["rolePrivileges", "DATABASE", activeConn.id],
    queryFn: () => privilegeApi.listByResource("DATABASE", activeConn.id),
  });

  // Mutation to assign
  const assignMutation = useMutation({
    mutationFn: (data: { roleId: string; privilegeTypeId: string }) =>
      privilegeApi.assignPrivilege({
        ...data,
        resourceType: "DATABASE",
        resourceId: activeConn.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rolePrivileges", "DATABASE", activeConn.id],
      });
      toast.success("Privilege updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation to revoke
  const revokeMutation = useMutation({
    mutationFn: (id: string) => privilegeApi.revokePrivilege(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rolePrivileges", "DATABASE", activeConn.id],
      });
      toast.success("Privilege revoked");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleToggle = (
    roleId: string,
    privilegeTypeId: string,
    isChecked: boolean,
  ) => {
    if (isChecked) {
      assignMutation.mutate({ roleId, privilegeTypeId });
    } else {
      // Find the specific assignment ID
      const assignment = rolePrivileges?.find(
        (rp) =>
          rp.roleId === roleId &&
          rp.privilegeTypeId === privilegeTypeId &&
          rp.resourceId === activeConn.id,
      );
      if (assignment) {
        revokeMutation.mutate(assignment.id);
      }
    }
  };

  // Group privileges by Role
  const permissionsByRole = new Map<string, RolePrivilege[]>();
  rolePrivileges?.forEach((rp) => {
    const list = permissionsByRole.get(rp.roleId) || [];
    list.push(rp);
    permissionsByRole.set(rp.roleId, list);
  });

  const assignedRoleIds = Array.from(permissionsByRole.keys());

  // Filter relevant Categories for Database
  const RELEVANT_CATEGORIES = [
    "DATA_ACCESS",
    "DATA_MUTATION",
    "SYSTEM",
    "QUERY_CAPABILITY",
    "DATA_EXFILTRATION",
    "SENSITIVE",
  ];
  const relevantPrivileges = privilegeTypes?.filter((pt) =>
    RELEVANT_CATEGORIES.includes(pt.category),
  );

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Access Control</h3>
          <p className="text-sm text-muted-foreground">
            Manage which roles can access this database and what they can do.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className={buttonVariants({ variant: "outline" })}>
            <Plus className="mr-2 h-4 w-4" /> Add Role
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Role to Database</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Select
                onValueChange={(val) => val && setSelectedRoleToAdd(val)}
                value={selectedRoleToAdd}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role...">
                    {roles?.find((r) => r.id === selectedRoleToAdd)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles
                    ?.filter((r) => !assignedRoleIds.includes(r.id))
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedRoleToAdd}
                onClick={() => {
                  // Just adding the UI entry - technically no privilege is assigned yet.
                  // We need to pick a default privilege or just close and let them toggle?
                  // Let's toggle "READ_METADATA" as default so it appears in list.
                  const readMeta = privilegeTypes?.find(
                    (p) => p.code === "READ_METADATA",
                  );
                  if (readMeta && selectedRoleToAdd) {
                    assignMutation.mutate({
                      roleId: selectedRoleToAdd,
                      privilegeTypeId: readMeta.id,
                    });
                    setIsAddOpen(false);
                    setSelectedRoleToAdd("");
                  }
                }}
              >
                Add Access
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Accordion type="multiple" className="w-full">
          {assignedRoleIds.map((roleId) => {
            const role = roles?.find((r) => r.id === roleId);
            const rolePerms = permissionsByRole.get(roleId) || [];

            return (
              <AccordionItem key={roleId} value={roleId}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-4 w-full">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-semibold">
                      {role?.name || "Unknown Role"}
                    </span>
                    <Badge variant="secondary" className="ml-auto mr-4">
                      {rolePerms.length} permissions
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Global Select All */}
                  {(() => {
                    const totalRelevant = relevantPrivileges?.length ?? 0;
                    const assignedCount =
                      relevantPrivileges?.filter((p) =>
                        rolePerms.some((rp) => rp.privilegeTypeId === p.id),
                      ).length ?? 0;
                    const allChecked =
                      totalRelevant > 0 && assignedCount === totalRelevant;
                    const isIndeterminate =
                      assignedCount > 0 && assignedCount < totalRelevant;

                    return (
                      <div className="flex items-center space-x-2 mb-4 pb-3 border-b">
                        <Checkbox
                          id={`${roleId}-select-all`}
                          className="cursor-pointer"
                          checked={
                            isIndeterminate ? "indeterminate" : allChecked
                          }
                          onCheckedChange={(checked) => {
                            const shouldAssign = checked === true;
                            relevantPrivileges?.forEach((priv) => {
                              const isAssigned = rolePerms.some(
                                (rp) => rp.privilegeTypeId === priv.id,
                              );
                              if (shouldAssign && !isAssigned) {
                                assignMutation.mutate({
                                  roleId,
                                  privilegeTypeId: priv.id,
                                });
                              } else if (!shouldAssign && isAssigned) {
                                const assignment = rolePerms.find(
                                  (rp) => rp.privilegeTypeId === priv.id,
                                );
                                if (assignment)
                                  revokeMutation.mutate(assignment.id);
                              }
                            });
                          }}
                        />
                        <label
                          htmlFor={`${roleId}-select-all`}
                          className="text-sm font-semibold leading-none cursor-pointer"
                        >
                          Select All
                        </label>
                        <span className="text-xs text-muted-foreground">
                          ({assignedCount}/{totalRelevant})
                        </span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {RELEVANT_CATEGORIES.map((category) => {
                      const categoryPrivileges =
                        relevantPrivileges?.filter(
                          (p) => p.category === category,
                        ) ?? [];
                      const categoryAssignedCount = categoryPrivileges.filter(
                        (p) =>
                          rolePerms.some((rp) => rp.privilegeTypeId === p.id),
                      ).length;
                      const categoryAllChecked =
                        categoryPrivileges.length > 0 &&
                        categoryAssignedCount === categoryPrivileges.length;
                      const categoryIndeterminate =
                        categoryAssignedCount > 0 &&
                        categoryAssignedCount < categoryPrivileges.length;

                      return (
                        <div key={category} className="space-y-2">
                          {/* Category Select All */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${roleId}-${category}-select-all`}
                              className="cursor-pointer"
                              checked={
                                categoryIndeterminate
                                  ? "indeterminate"
                                  : categoryAllChecked
                              }
                              onCheckedChange={(checked) => {
                                const shouldAssign = checked === true;
                                categoryPrivileges.forEach((priv) => {
                                  const isAssigned = rolePerms.some(
                                    (rp) => rp.privilegeTypeId === priv.id,
                                  );
                                  if (shouldAssign && !isAssigned) {
                                    assignMutation.mutate({
                                      roleId,
                                      privilegeTypeId: priv.id,
                                    });
                                  } else if (!shouldAssign && isAssigned) {
                                    const assignment = rolePerms.find(
                                      (rp) => rp.privilegeTypeId === priv.id,
                                    );
                                    if (assignment)
                                      revokeMutation.mutate(assignment.id);
                                  }
                                });
                              }}
                            />
                            <label
                              htmlFor={`${roleId}-${category}-select-all`}
                              className="text-xs font-semibold text-muted-foreground uppercase cursor-pointer"
                            >
                              {category.replace(/_/g, " ")}
                            </label>
                          </div>
                          <div className="space-y-1 pl-6">
                            {categoryPrivileges.map((priv) => {
                              const isAssigned = rolePerms.some(
                                (rp) => rp.privilegeTypeId === priv.id,
                              );
                              return (
                                <div
                                  key={priv.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`${roleId}-${priv.id}`}
                                    className="cursor-pointer"
                                    checked={isAssigned}
                                    onCheckedChange={(checked) =>
                                      handleToggle(
                                        roleId,
                                        priv.id,
                                        checked as boolean,
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`${roleId}-${priv.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {priv.code}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        // Revoke ALL privileges for this role on this resource
                        rolePerms.forEach((rp) => revokeMutation.mutate(rp.id));
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Remove All Access
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}

          {assignedRoleIds.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No access control configured for this database. Click "Add Role"
              to start.
            </div>
          )}
        </Accordion>
      </div>
    </div>
  );
}
