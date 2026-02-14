/**
 * @file SensitivePolicyTable.tsx
 * @description Table component for displaying and managing sensitive policies.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit, Shield, Eye, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SensitivePolicy } from "@/lib/sensitive-data-types";
import { ProtectionStrategy } from "@/lib/sensitive-data-types";

interface SensitivePolicyTableProps {
  policies: SensitivePolicy[];
  onEdit: (policy: SensitivePolicy) => void;
  onDelete: (id: string) => void;
}

const getStrategyIcon = (strategy: ProtectionStrategy) => {
  switch (strategy) {
    case ProtectionStrategy.ACCESS_DENY:
      return <Lock className="h-4 w-4 text-red-500 mr-2" />;
    case ProtectionStrategy.MASKING:
    case ProtectionStrategy.REDACTION:
      return <Eye className="h-4 w-4 text-orange-500 mr-2" />;
    case ProtectionStrategy.ENCRYPTION:
    case ProtectionStrategy.HASHING:
    case ProtectionStrategy.TOKENIZATION:
      return <Shield className="h-4 w-4 text-blue-500 mr-2" />;
    default:
      return null;
  }
};

const getStrategyBadge = (strategy: ProtectionStrategy) => {
  const label = strategy.replace("_", " ").toLowerCase();
  return (
    <div className="flex items-center">
      {getStrategyIcon(strategy)}
      <span className="capitalize">{label}</span>
    </div>
  );
};

export function SensitivePolicyTable({
  policies,
  onEdit,
  onDelete,
}: SensitivePolicyTableProps) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 dark:bg-black">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 dark:bg-slate-900/40">
            <TableHead className="font-semibold">Privilege</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Protection Strategy</TableHead>
            <TableHead className="font-semibold">Condition</TableHead>
            <TableHead className="w-25 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-slate-500"
              >
                No policies defined.
              </TableCell>
            </TableRow>
          ) : (
            policies.map((policy) => (
              <TableRow
                key={policy.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
              >
                <TableCell>
                  <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {policy.privilege_type}
                  </code>
                </TableCell>
                <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                  {policy.role_name || policy.role_id}
                </TableCell>
                <TableCell>
                  {getStrategyBadge(policy.protection_strategy)}
                </TableCell>
                <TableCell className="max-w-50 truncate text-slate-500 text-sm italic">
                  {policy.policy_expr || "None"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-8 w-8 p-0",
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(policy)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onDelete(policy.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
