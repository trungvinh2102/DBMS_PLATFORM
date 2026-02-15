/**
 * @file PolicyExceptionTable.tsx
 * @description Table component for displaying and managing Policy Exceptions.
 */

"use client";

import React from "react";
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
import { Eye, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { PolicyException } from "@/lib/policy-exception-types";

interface PolicyExceptionTableProps {
  exceptions: PolicyException[];
  onView: (exception: PolicyException) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isAdmin?: boolean;
}

export function PolicyExceptionTable({
  exceptions,
  onView,
  onApprove,
  onReject,
  isAdmin = false,
}: PolicyExceptionTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">
            Pending
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
            Rejected
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">
            Expired
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "HIGH":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "MEDIUM":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-black overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-900">
          <TableRow>
            <TableHead className="w-25">ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Privilege</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exceptions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-slate-500"
              >
                No policy exceptions found.
              </TableCell>
            </TableRow>
          ) : (
            exceptions.map((exception) => (
              <TableRow
                key={exception.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <TableCell className="font-medium text-blue-600">
                  {exception.id}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{exception.subjectId}</span>
                    <span className="text-xs text-slate-400">
                      {exception.subjectType}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400">
                    {exception.overridePrivilege}
                  </code>
                </TableCell>
                <TableCell className="max-w-50 truncate">
                  {exception.purpose}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(exception.startTime), "MMM d, HH:mm")}
                    </div>
                    <span>
                      to {format(new Date(exception.endTime), "MMM d, HH:mm")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {getRiskIcon(exception.riskLevel)}
                    <span className="text-xs font-medium">
                      {exception.riskLevel}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(exception.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(exception)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && exception.status === "PENDING" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onApprove?.(exception.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onReject?.(exception.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
