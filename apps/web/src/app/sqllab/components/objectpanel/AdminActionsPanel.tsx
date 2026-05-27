/**
 * @file AdminActionsPanel.tsx
 * @description Guarded administration actions for selected database metadata objects.
 */

import React from "react";
import { AlertTriangle, Loader2, Play, RotateCcw, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { databaseApi } from "@/lib/api-client";
import { IS_AUTH_DISABLED, useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AdminActionDefinition = {
  action: string;
  label: string;
  description: string;
  riskLevel: "medium" | "high";
  needsRestartValue?: boolean;
};

type AdminActionPreview = {
  sql: string;
  message: string;
  riskLevel: string;
  executed: boolean;
};

type AdminActionsPanelProps = {
  databaseId: string;
  schemaName?: string;
  objectType?: string;
  objectName?: string | null;
  databaseType?: string;
  onExecuted?: () => void;
};

export function AdminActionsPanel({
  databaseId,
  schemaName,
  objectType,
  objectName,
  databaseType,
  onExecuted,
}: AdminActionsPanelProps) {
  const [selectedAction, setSelectedAction] = React.useState<AdminActionDefinition | null>(null);
  const [restartWith, setRestartWith] = React.useState("1");
  const [preview, setPreview] = React.useState<AdminActionPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const user = useAuth((state) => state.user);
  const canManageAdminActions = IS_AUTH_DISABLED || user?.role?.toLowerCase() === "admin";

  const actions = React.useMemo(
    () => getAdminActions(databaseType, objectType),
    [databaseType, objectType],
  );

  const openAction = async (action: AdminActionDefinition) => {
    setSelectedAction(action);
    setPreview(null);
    setIsOpen(true);
    await previewAction(action);
  };

  const buildPayload = (action: AdminActionDefinition, execute = false) => ({
    databaseId,
    objectType: objectType || "",
    objectName: objectName || "",
    action: action.action,
    schemaName,
    options: action.needsRestartValue ? { restartWith } : {},
    execute,
    confirmation: execute ? "EXECUTE" : undefined,
  });

  const previewAction = async (action = selectedAction) => {
    if (!action || !objectName) return;
    try {
      setIsPreviewing(true);
      const result = await databaseApi.runAdminAction(buildPayload(action, false));
      setPreview(result);
    } catch (error: any) {
      toast.error(error.message || "Failed to build admin action");
    } finally {
      setIsPreviewing(false);
    }
  };

  const executeAction = async () => {
    if (!selectedAction || !objectName) return;
    try {
      setIsExecuting(true);
      const result = await databaseApi.runAdminAction(buildPayload(selectedAction, true));
      setPreview(result);
      toast.success(result.message || "Admin action executed");
      onExecuted?.();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Admin action failed");
    } finally {
      setIsExecuting(false);
    }
  };

  if (!objectName || actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          Admin Actions
        </h4>
        <div className="h-px flex-1 bg-border/40 ml-4" />
      </div>

      {!canManageAdminActions ? (
        <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground">
          Admin role required.
        </div>
      ) : null}

      {canManageAdminActions ? (
        <div className="grid gap-2">
          {actions.map((action) => (
            <button
              key={action.action}
              type="button"
              onClick={() => openAction(action)}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-foreground">{action.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{action.description}</span>
              </span>
              <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
            </button>
          ))}
        </div>
      ) : null}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedAction?.label}</DialogTitle>
            <DialogDescription>
              Review the generated SQL before executing this administration action.
            </DialogDescription>
          </DialogHeader>

          {selectedAction?.needsRestartValue && (
            <div className="space-y-1.5">
              <Label htmlFor="restart-with">Restart with</Label>
              <div className="flex gap-2">
                <Input
                  id="restart-with"
                  type="number"
                  min={1}
                  value={restartWith}
                  onChange={(event) => setRestartWith(event.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => previewAction()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
            </div>
          )}

          <div
            className={cn(
              "rounded-lg border p-3",
              selectedAction?.riskLevel === "high"
                ? "border-destructive/30 bg-destructive/5"
                : "border-amber-500/30 bg-amber-500/5",
            )}
          >
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {selectedAction?.riskLevel === "high" ? "High risk" : "Medium risk"}
            </div>
            <p className="text-xs text-muted-foreground">{selectedAction?.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" />
              SQL Preview
            </div>
            <pre className="max-h-52 overflow-auto rounded-lg border bg-muted/20 p-3 text-xs text-foreground">
              {isPreviewing ? "Building preview..." : preview?.sql || "-- No preview available"}
            </pre>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={selectedAction?.riskLevel === "high" ? "destructive" : "default"}
              disabled={isExecuting || isPreviewing || !preview?.sql}
              onClick={executeAction}
            >
              {isExecuting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getAdminActions(databaseType?: string, objectType?: string): AdminActionDefinition[] {
  const dbType = (databaseType || "").toLowerCase();
  const type = (objectType || "").toLowerCase();
  const isPostgres = dbType.includes("postgres");
  const isSqlServer = dbType.includes("sqlserver") || dbType.includes("mssql");

  if (isPostgres && type === "materialized_view") {
    return [
      {
        action: "refresh",
        label: "Refresh materialized view",
        description: "Replace cached rows by rerunning the materialized view query.",
        riskLevel: "medium",
      },
      {
        action: "refresh_concurrently",
        label: "Refresh concurrently",
        description: "Refresh while allowing concurrent reads when a suitable unique index exists.",
        riskLevel: "medium",
      },
    ];
  }
  if ((isPostgres || isSqlServer) && type === "sequence") {
    return [
      {
        action: "restart_with",
        label: "Restart sequence",
        description: "Set the next generated sequence value. Existing data may conflict if the value is too low.",
        riskLevel: "high",
        needsRestartValue: true,
      },
    ];
  }
  if (isPostgres && type === "extension") {
    return [
      {
        action: "drop",
        label: "Drop extension",
        description: "Remove the extension from this database. Dependent objects may be affected.",
        riskLevel: "high",
      },
    ];
  }
  if ((dbType.includes("mysql") || dbType.includes("mariadb")) && type === "event") {
    return toggleActions("event");
  }
  if (dbType.includes("oracle") && ["materialized_view", "job"].includes(type)) {
    if (type === "materialized_view") {
      return [
        {
          action: "refresh",
          label: "Refresh materialized view",
          description: "Refresh the materialized view through DBMS_MVIEW.",
          riskLevel: "medium",
        },
      ];
    }
    return toggleActions("job");
  }
  if (isSqlServer && type === "job") {
    return toggleActions("job");
  }
  return [];
}

function toggleActions(objectLabel: string): AdminActionDefinition[] {
  return [
    {
      action: "enable",
      label: `Enable ${objectLabel}`,
      description: `Allow this ${objectLabel} to run again.`,
      riskLevel: "high",
    },
    {
      action: "disable",
      label: `Disable ${objectLabel}`,
      description: `Stop this ${objectLabel} from running until it is enabled again.`,
      riskLevel: "high",
    },
  ];
}
