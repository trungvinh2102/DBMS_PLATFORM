"use client";

import { MaskingPolicy, MaskingRuleType } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  policies: MaskingPolicy[];
  onEdit: (policy: MaskingPolicy) => void;
  onDelete: (id: string) => void;
}

export function MaskingPolicyTable({ policies, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Policy Name</TableHead>
            <TableHead>Target (Table.Column)</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No policies found.
              </TableCell>
            </TableRow>
          ) : (
            policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell className="font-medium">{policy.name}</TableCell>
                <TableCell>
                  {policy.resourceTable}.{policy.resourceColumn}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {policy.roleName || policy.roleId || "All Roles"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{policy.maskingType}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        policy.isEnabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {policy.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(policy)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => onDelete(policy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
