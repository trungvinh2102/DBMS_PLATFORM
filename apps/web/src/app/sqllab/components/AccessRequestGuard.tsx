"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accessRequestApi, roleApi } from "@/lib/api-client";
import { socketClient } from "@/lib/socket-client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Clock,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AccessRequestGuard({
  children,
  hasAccess,
  isLoading,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
  isLoading: boolean;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  // Role ID derived from user role match
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duration, setDuration] = useState("24h");

  // Fetch Viewer/Creator/Admin roles to let user request upgrad
  // Just showing all roles for simplicity or filter by relevant ones.
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.list(),
  });

  const roleId = roles?.find(
    (r) => r.name === user?.role || r.id === user?.role,
  )?.id;

  const handleSubmit = async () => {
    if (!roleId) {
      toast.error("Could not determine your role. Please contact support.");
      return;
    }

    if (!reason) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      setIsSubmitting(true);

      // Calculate valid_until based on duration
      // This is a simple implementation. Ideally backend validates.
      const now = new Date();
      let validUntil: Date | undefined = undefined;

      if (duration === "1h")
        validUntil = new Date(now.getTime() + 60 * 60 * 1000);
      else if (duration === "24h")
        validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      else if (duration === "7d")
        validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      else if (duration === "30d")
        validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await accessRequestApi.create({
        roleId,
        reason,
        // valid_from: new Date().toISOString(), // Removed to allow immediate access (backend handles None as start of time or now)
        valid_until: validUntil?.toISOString(),
      });

      toast.success("Access request submitted successfully");
      refetchRequests(); // Refresh the list to show Pending state immediately
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ----------------------------------------------------------------------------------------------
   * STATE & DATA
   * ----------------------------------------------------------------------------------------------*/
  const { data: requests, refetch: refetchRequests } = useQuery({
    queryKey: ["access-requests"],
    queryFn: () => accessRequestApi.list(),
    enabled: !hasAccess,
  });

  // Get the most relevant request (latest)
  // Assuming list returns chronologically or we sort.
  // We'll trust the API returns latest first or we sort by date.
  const latestRequest =
    requests && Array.isArray(requests)
      ? requests.sort(
          (a: any, b: any) =>
            new Date(b.created_on || 0).getTime() -
            new Date(a.created_on || 0).getTime(),
        )[0]
      : null;

  const status = latestRequest?.status;

  useEffect(() => {
    if (!user) return;

    const handleUpdate = (req: any) => {
      // Check if request belongs to current user
      if (req.userId === user.id) {
        refetchRequests();

        // If status changed to APPROVED (from something else), show success toast
        if (req.status === "APPROVED" && status !== "APPROVED") {
          toast.success("Your access request has been approved!");
        }
      }
    };

    socketClient.on("access_request_created", handleUpdate);
    socketClient.on("access_request_updated", handleUpdate);

    return () => {
      socketClient.off("access_request_created", handleUpdate);
      socketClient.off("access_request_updated", handleUpdate);
    };
  }, [user, refetchRequests, status]);

  /* ----------------------------------------------------------------------------------------------
   * RENDERING
   * ----------------------------------------------------------------------------------------------*/
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // --- BLOCKED STATE ---
  if (status === "BLOCKED" || status === "BLOCK") {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10 p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <Ban className="w-6 h-6" />
              <CardTitle>Access Blocked</CardTitle>
            </div>
            <CardDescription>
              Your access to this resource has been blocked by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your system administrator if you believe this is an
              error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- APPROVED STATE (But hasAccess is false yet) ---
  if (status === "APPROVED" || status === "ACCEPT") {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10 p-4">
        <Card className="max-w-md w-full border-green-500/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <CheckCircle className="w-6 h-6" />
              <CardTitle>Request Approved</CardTitle>
            </div>
            <CardDescription>
              Your access request has been approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The system is syncing your permissions. Please refresh the page.
            </p>
            <Button className="w-full" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- PENDING / WAITING STATE ---
  // If user has a pending request, show status instead of form
  if (status === "PENDING" || status === "WAITING" || status === "WATTING") {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Clock className="w-6 h-6 animate-pulse" />
              <CardTitle>Request Pending</CardTitle>
            </div>
            <CardDescription>
              Your access request is currently under review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>
                <strong>Role:</strong>{" "}
                {latestRequest.roleName || latestRequest.role_id || "Unknown"}
              </p>
              <p>
                <strong>Requested:</strong>{" "}
                {new Date(latestRequest.created_on).toLocaleString()}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => refetchRequests()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- REJECTED STATE ---
  // If rejected, we show the rejection message but allow submittig a NEW request.
  // So we render the form, but maybe with an alert at the top?
  // Or we show a Rejected Result card with a "Try Again" button that clears the "view".
  // Let's do the notification approach: if last was rejected, show alert in form?
  // Actually, a dedicated card is clearer.

  return (
    <div className="flex items-center justify-center h-full bg-muted/10 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Restricted Access</CardTitle>
          <CardDescription>
            You do not have permission to access SQLLab. You can request
            temporary or permanent access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rejection Alert */}
          {(status === "REJECTED" || status === "REJEECT") && (
            <div className="flex flex-col gap-2 p-3 border border-destructive/50 bg-destructive/10 rounded-md text-destructive mb-4">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle className="w-5 h-5" />
                Request Rejected
              </div>
              <p className="text-sm text-destructive-foreground/90">
                {latestRequest.reason_reject ||
                  latestRequest.rejectionReason ||
                  "No reason provided."}
              </p>
            </div>
          )}

          {/* Role selection removed - automatically inferred */}

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={duration}
              onValueChange={(val) => setDuration(val || "24h")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="Why do you need access?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Submit Request
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
