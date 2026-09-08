/**
 * @file DatasourceStatusBadge.tsx
 * @description Connection monitor for SQL Lab. Automatically probes datasource reachability and presents an error dialog on failure.
 *
 * @example
 * <DatasourceStatusBadge connection={{ id: "ds-1", type: "postgresql" }} />
 */

import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import {
  useConnectionStatus,
  type UseConnectionStatusProps,
} from "@/app/connections/hooks/use-connection-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DatasourceStatusBadgeProps {
  connection?: UseConnectionStatusProps;
  className?: string;
}

export function DatasourceStatusBadge({
  connection,
  className,
}: DatasourceStatusBadgeProps) {
  const isSelected = Boolean(connection?.id && connection?.type);
  const { status, message, isRetryPending, retry } = useConnectionStatus(
    isSelected ? connection : undefined,
  );

  const effectiveStatus = isSelected ? status : "none";
  const connectionKey = isSelected ? `${connection?.id}:${connection?.type}` : null;

  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const prevConnectionKeyRef = useRef<string | null>(connectionKey);
  const prevStatusRef = useRef<string>(effectiveStatus);

  useEffect(() => {
    const prevKey = prevConnectionKeyRef.current;
    const prevStatus = prevStatusRef.current;

    prevConnectionKeyRef.current = connectionKey;
    prevStatusRef.current = effectiveStatus;

    // Reset popup when connection selection changes
    if (connectionKey !== prevKey) {
      setIsOpen(false);
      setErrorMessage("");
      return;
    }

    // Dismiss popup on success or if unselected
    if (effectiveStatus === "connected" || effectiveStatus === "none") {
      setIsOpen(false);
      return;
    }

    // On failure, capture non-empty message or fallback
    if (effectiveStatus === "unavailable" || effectiveStatus === "forbidden") {
      const fallback =
        effectiveStatus === "forbidden"
          ? "You do not have permission to test this connection."
          : "Connection unavailable";
      const resolved = message?.trim() ? message.trim() : fallback;
      setErrorMessage(resolved);

      // Open popup when transitioning into failure state
      if (prevStatus === "checking" || prevStatus === "none") {
        setIsOpen(true);
      }
    }
  }, [connectionKey, effectiveStatus, message]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleRetry = () => {
    retry();
  };

  const displayMessage =
    errorMessage ||
    (effectiveStatus === "forbidden"
      ? "You do not have permission to test this connection."
      : "Connection unavailable");

  return (
    <Dialog modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent showCloseButton={false} className={className}>
        <DialogHeader>
          <DialogTitle>Connection failed</DialogTitle>
          <DialogDescription className="break-words">
            {displayMessage}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleRetry} disabled={isRetryPending}>
            {isRetryPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
