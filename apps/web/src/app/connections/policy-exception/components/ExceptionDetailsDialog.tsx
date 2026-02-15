/**
 * @file ExceptionDetailsDialog.tsx
 * @description Dialog for viewing and managing Policy Exception details.
 */

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  User,
  Database,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
} from "lucide-react";
import { format } from "date-fns";
import type { PolicyException } from "@/lib/policy-exception-types";

interface ExceptionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exception: PolicyException | null;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isAdmin?: boolean;
}

export function ExceptionDetailsDialog({
  open,
  onOpenChange,
  exception,
  onApprove,
  onReject,
  isAdmin = false,
}: ExceptionDetailsDialogProps) {
  if (!exception) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              <DialogTitle>Exception Details: {exception.id}</DialogTitle>
            </div>
            {getStatusBadge(exception.status)}
          </div>
          <DialogDescription className="mt-1">
            Full details and audit information for this policy exception
            request.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <User className="h-3 w-3" />
                  Subject
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {exception.subjectId}
                  </span>
                  <span className="text-xs text-slate-500">
                    {exception.subjectType}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <Database className="h-3 w-3" />
                  Privilege & Scope
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400">
                    {exception.overridePrivilege}
                  </code>
                  <span className="text-xs text-slate-500">
                    on {exception.scope}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <Calendar className="h-3 w-3" />
                  Duration
                </div>
                <div className="flex flex-col text-sm">
                  <span>
                    From: {format(new Date(exception.startTime), "PPpp")}
                  </span>
                  <span>To: {format(new Date(exception.endTime), "PPpp")}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <AlertTriangle className="h-3 w-3" />
                  Risk Assessment
                </div>
                <Badge variant="outline" className="font-medium">
                  {exception.riskLevel} Risk
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <FileText className="h-3 w-3" />
              Business Purpose
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-md italic">
              "{exception.purpose}"
            </p>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <History className="h-3 w-3" />
              Timeline
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">
                    Requested on {format(new Date(exception.createdOn), "PPpp")}
                  </span>
                  <span className="text-xs text-slate-500">
                    by {exception.subjectId}
                  </span>
                </div>
              </div>
              {exception.approvedBy && (
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      Approved by {exception.approvedBy}
                    </span>
                    <span className="text-xs text-slate-500">
                      Access key generated
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {isAdmin && exception.status === "PENDING" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  onReject?.(exception.id);
                  onOpenChange(false);
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onApprove?.(exception.id);
                  onOpenChange(false);
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
