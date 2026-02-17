"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accessRequestApi, roleApi, userApi } from "@/lib/api-client";
import { socketClient } from "@/lib/socket-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AccessRequest } from "@/lib/types";
import { Loader2, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccessRequestsTab() {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    requestId: string | null;
  }>({
    open: false,
    requestId: null,
  });
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["accessRequests"] });
    };

    socketClient.on("access_request_created", handleUpdate);
    socketClient.on("access_request_updated", handleUpdate);

    return () => {
      socketClient.off("access_request_created", handleUpdate);
      socketClient.off("access_request_updated", handleUpdate);
    };
  }, [queryClient]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["accessRequests"],
    queryFn: () => accessRequestApi.list() as Promise<AccessRequest[]>,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  // Ideally, we'd also fetch users map or the request would include user details.
  // The AccessRequest serialization in backend includes user object.
  // Let's assume the API returns { user: { name: ... }, role: { name: ... }, ... }

  const approveMutation = useMutation({
    mutationFn: (id: string) => accessRequestApi.approve(id),
    onSuccess: () => {
      toast.success("Request approved");
      queryClient.invalidateQueries({ queryKey: ["accessRequests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      accessRequestApi.reject(vars.id, vars.reason),
    onSuccess: () => {
      toast.success("Request rejected");
      setRejectDialog({ open: false, requestId: null });
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["accessRequests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleRejectClick = (id: string) => {
    setRejectDialog({ open: true, requestId: id });
  };

  const confirmReject = () => {
    if (rejectDialog.requestId) {
      rejectMutation.mutate({
        id: rejectDialog.requestId,
        reason: rejectReason,
      });
    }
  };

  const statusColor = (status: AccessRequest["status"]) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No access requests found.
                </TableCell>
              </TableRow>
            )}
            {requests?.map((req: AccessRequest) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {req.fullName || req.username || req.userId}
                    </span>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      {req.username && <span>@{req.username}</span>}
                      <span>{req.userEmail}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="w-fit">
                      {req.roleName || req.roleId}
                    </Badge>
                    {req.roleDescription && (
                      <span
                        className="text-xs text-muted-foreground max-w-37.5 truncate"
                        title={req.roleDescription}
                      >
                        {req.roleDescription}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className="max-w-50 truncate"
                  title={req.requestReason}
                >
                  {req.requestReason || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs">
                    {req.valid_from && (
                      <span className="whitespace-nowrap">
                        From: {format(new Date(req.valid_from), "MMM d, HH:mm")}
                      </span>
                    )}
                    {req.valid_until ? (
                      <span className="whitespace-nowrap">
                        Until:{" "}
                        {format(new Date(req.valid_until), "MMM d, HH:mm")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Permanent</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      className={statusColor(req.status)}
                      variant="secondary"
                    >
                      {req.status}
                    </Badge>
                    {req.status === "REJECTED" && req.rejectionReason && (
                      <span
                        className="text-[10px] text-red-600 dark:text-red-400 max-w-40 truncate"
                        title={req.rejectionReason}
                      >
                        Reason: {req.rejectionReason}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {req.created_on &&
                    format(new Date(req.created_on), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  {req.status === "PENDING" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectClick(req.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(o) =>
          !o && setRejectDialog({ open: false, requestId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this access request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Insufficient justification"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, requestId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectReason}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
