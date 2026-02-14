/**
 * @file SensitiveResourceTable.tsx
 * @description Table component for displaying and managing sensitive resources.
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
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SensitiveResource } from "@/lib/sensitive-data-types";
import { SensitivityLevel } from "@/lib/sensitive-data-types";

interface SensitiveResourceTableProps {
  resources: SensitiveResource[];
  onEdit: (resource: SensitiveResource) => void;
  onDelete: (id: string) => void;
}

const getSensitivityBadge = (level: SensitivityLevel) => {
  switch (level) {
    case SensitivityLevel.PUBLIC:
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 hover:bg-blue-100"
        >
          Public
        </Badge>
      );
    case SensitivityLevel.INTERNAL:
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 hover:bg-green-100"
        >
          Internal
        </Badge>
      );
    case SensitivityLevel.CONFIDENTIAL:
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
        >
          Confidential
        </Badge>
      );
    case SensitivityLevel.SENSITIVE:
      return (
        <Badge
          variant="secondary"
          className="bg-orange-100 text-orange-700 hover:bg-orange-100"
        >
          Sensitive
        </Badge>
      );
    case SensitivityLevel.PII:
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-700 hover:bg-red-100"
        >
          PII
        </Badge>
      );
    case SensitivityLevel.CRITICAL:
      return (
        <Badge
          variant="destructive"
          className="bg-red-600 text-white hover:bg-red-600"
        >
          Critical
        </Badge>
      );
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
};

export function SensitiveResourceTable({
  resources,
  onEdit,
  onDelete,
}: SensitiveResourceTableProps) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 dark:bg-black">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 dark:bg-slate-900/40">
            <TableHead className="font-semibold">Resource Name</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Sensitivity</TableHead>
            <TableHead className="font-semibold">Owner</TableHead>
            <TableHead className="w-25 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-slate-500"
              >
                No sensitive resources found.
              </TableCell>
            </TableRow>
          ) : (
            resources.map((resource) => (
              <TableRow
                key={resource.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
              >
                <TableCell className="font-medium">
                  {resource.resource_name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {resource.resource_type.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getSensitivityBadge(resource.sensitivity_level)}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {resource.owner || "N/A"}
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
                      <DropdownMenuItem onClick={() => onEdit(resource)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onDelete(resource.id)}
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
