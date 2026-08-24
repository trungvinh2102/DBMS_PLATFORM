/**
 * @file ExecuteConfirmationDialog.tsx
 * @description Presents the server-issued confirmation required before risky SQL executes.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SqlExecutionConfirmation } from "@/lib/api-client";

type PendingExecution = SqlExecutionConfirmation & {
  databaseId: string;
  sql: string;
  autoCommit: boolean;
  limit: number;
};

interface ExecuteConfirmationDialogProps {
  pending: PendingExecution | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExecuteConfirmationDialog({
  pending,
  onConfirm,
  onCancel,
}: ExecuteConfirmationDialogProps) {
  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Confirm SQL execution</DialogTitle>
          <DialogDescription>{pending?.reason}</DialogDescription>
        </DialogHeader>
        {pending && (
          <div className="space-y-3">
            <p className="text-sm">Database: {pending.databaseId} · Risk: {pending.risk}</p>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-sm">{pending.sql}</pre>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Run anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
