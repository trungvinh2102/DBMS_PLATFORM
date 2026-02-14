"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { privilegeApi, roleApi } from "@/lib/api-client";
import type { Role, RolePrivilege } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RolePrivilegesProps {
  role: Role;
}

export function RolePrivileges({ role }: RolePrivilegesProps) {
  const queryClient = useQueryClient();

  const { data: privileges } = useQuery({
    queryKey: ["privilegeTypes"],
    queryFn: () => privilegeApi.listTypes(),
  });

  const { data: assignedPrivileges } = useQuery({
    queryKey: ["rolePrivileges", role.id],
    queryFn: () => privilegeApi.listRolePrivileges(role.id),
  });

  const assignMutation = useMutation({
    mutationFn: (data: { roleId: string; privilegeTypeId: string }) =>
      privilegeApi.assignPrivilege(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rolePrivileges", role.id] });
      toast.success("Privilege assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => privilegeApi.revokePrivilege(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rolePrivileges", role.id] });
      toast.success("Privilege revoked");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleToggle = (privilegeId: string, isChecked: boolean) => {
    if (isChecked) {
      assignMutation.mutate({
        roleId: role.id,
        privilegeTypeId: privilegeId,
      });
    } else {
      const assignment = assignedPrivileges?.find(
        (rp) => rp.privilegeTypeId === privilegeId,
      );
      if (assignment) {
        revokeMutation.mutate(assignment.id);
      }
    }
  };

  const categories = Array.from(
    new Set(privileges?.map((p) => p.category) || []),
  );

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Privilege</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Configuration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <>
              <TableRow key={category} className="bg-muted/50">
                <TableCell colSpan={5} className="font-semibold py-2">
                  {category.replace("_", " ")}
                </TableCell>
              </TableRow>
              {privileges
                ?.filter((p) => p.category === category)
                .map((privilege) => {
                  const assignment = assignedPrivileges?.find(
                    (rp) => rp.privilegeTypeId === privilege.id,
                  );
                  const isAssigned = !!assignment;

                  return (
                    <TableRow key={privilege.id}>
                      <TableCell>
                        <Checkbox
                          checked={isAssigned}
                          onCheckedChange={(checked) =>
                            handleToggle(privilege.id, checked as boolean)
                          }
                          disabled={role.item_type === "SYSTEM" && false} // Allow editing systems permissions? Usually no, but for demo maybe yes.
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {privilege.code}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {privilege.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {privilege.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAssigned && (
                          <div className="flex justify-end gap-2 text-xs text-muted-foreground">
                            {assignment.resourceType === "SYSTEM" ? (
                              <Badge variant="secondary">System-wide</Badge>
                            ) : (
                              <Badge variant="outline">
                                {assignment.resourceType} :{" "}
                                {assignment.resourceId || "*"}
                              </Badge>
                            )}
                            {assignment.conditionExpr && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="default">Condition</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{assignment.conditionExpr}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
