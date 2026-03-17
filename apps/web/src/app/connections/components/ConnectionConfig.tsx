/**
 * @file ConnectionConfig.tsx
 * @description Connection configuration and detail view component.
 * Displays and allows editing of database connection settings.
 *
 * @example
 * <ConnectionConfig activeConn={conn} onBack={() => ...} />
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Database, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleField } from "./ConfigFields";
import {
  EnvironmentSection,
  SecuritySection,
  PermissionsSection,
  PoolingSection,
} from "./ConfigSections";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { DB_TYPES } from "./constants";

interface ConnectionConfigProps {
  activeConn: any;
  onBack: () => void;
}

export function ConnectionConfig({
  activeConn,
  onBack,
}: ConnectionConfigProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Initialize form state from activeConn data
  const [environment, setEnvironment] = useState(
    activeConn.environment || "DEVELOPMENT",
  );
  const [isReadOnly, setIsReadOnly] = useState(activeConn.isReadOnly || false);
  const [sslMode, setSslMode] = useState(activeConn.sslMode || "DISABLE");
  const [pooling, setPooling] = useState({
    pool_size: activeConn.config?.pool_size || 5,
    max_overflow: activeConn.config?.max_overflow || 10,
    pool_timeout: activeConn.config?.pool_timeout || 30,
    pool_recycle: activeConn.config?.pool_recycle || 1800,
  });

  const handlePoolingChange = (field: string, value: number) => {
    setPooling((prev) => ({ ...prev, [field]: value }));
  };

  // Find the database type info
  const dbType =
    DB_TYPES.find((t) => t.id === activeConn.type) ||
    DB_TYPES.find((t) => t.id === "postgres");

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => databaseApi.update(data),
    onSuccess: () => {
      toast.success("Configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["databases"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save configuration");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: activeConn.id,
      databaseName: activeConn.databaseName,
      type: activeConn.type,
      environment,
      isReadOnly,
      sslMode,
      config: {
        ...(activeConn.config || {}),
        ...pooling,
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-muted/10 rounded-md transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">{dbType?.icon}</span>
              <h2 className="text-xl font-bold tracking-tight uppercase">
                {activeConn.databaseName}
              </h2>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground font-medium ml-10">
            Connection ID:{" "}
            <code className="text-xs bg-muted/20 px-1.5 py-0.5 rounded">
              {activeConn.id}
            </code>
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-8 px-3 font-semibold uppercase tracking-wide text-[10px] border-border hover:bg-muted/10 rounded-md gap-2"
            onClick={() => router.push(`/sqllab?ds=${activeConn.id}` as any)}
          >
            <Database className="h-3.5 w-3.5" />
            Explore Data
          </Button>
          <Button
            className="h-8 px-3 font-semibold uppercase tracking-wide text-[10px] bg-foreground text-background hover:bg-foreground/90 rounded-md shadow-sm gap-2"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Connection Info Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-1 p-4 bg-muted/5 border border-border rounded-lg">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
            Database Type
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-lg">{dbType?.icon}</span>
            <span className="text-sm font-semibold">
              {dbType?.name || activeConn.type}
            </span>
          </div>
        </div>
        <div className="space-y-1 p-4 bg-muted/5 border border-border rounded-lg">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
            Host
          </Label>
          <p className="text-sm font-semibold truncate">
            {activeConn.config?.host || "—"}
          </p>
        </div>
        <div className="space-y-1 p-4 bg-muted/5 border border-border rounded-lg">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
            Port
          </Label>
          <p className="text-sm font-semibold">
            {activeConn.config?.port || "—"}
          </p>
        </div>
        <div className="space-y-1 p-4 bg-muted/5 border border-border rounded-lg">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
            Username
          </Label>
          <p className="text-sm font-semibold truncate">
            {activeConn.config?.user || "—"}
          </p>
        </div>
      </div>

      {/* Configuration Sections */}
      <section className="space-y-8 w-full">
        {/* Environment & Access */}
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Environment
            </Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger className="h-10 font-medium border-border bg-muted/10 rounded-md text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem
                  value="PRODUCTION"
                  className="font-semibold text-red-500 text-xs"
                >
                  PRODUCTION
                </SelectItem>
                <SelectItem
                  value="STAGING"
                  className="font-semibold text-orange-500 text-xs"
                >
                  STAGING
                </SelectItem>
                <SelectItem
                  value="DEVELOPMENT"
                  className="font-semibold text-emerald-500 text-xs"
                >
                  DEVELOPMENT
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Access Start Time
            </Label>
            <div className="relative">
              <Input
                placeholder="SELECT TIME_WINDOW"
                className="h-10 border-border bg-muted/10 rounded-md font-medium text-sm placeholder:text-muted-foreground/40"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 text-foreground" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Access End Time
            </Label>
            <div className="relative">
              <Input
                placeholder="SELECT TIME_WINDOW"
                className="h-10 border-border bg-muted/10 rounded-md font-medium text-sm placeholder:text-muted-foreground/40"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 text-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Weekday Access Denied
            </Label>
            <Input className="h-10 border-border bg-muted/10 rounded-md font-medium text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Maximum Login Failures
            </Label>
            <Select defaultValue="disabled">
              <SelectTrigger className="h-9 font-medium border-border bg-muted/10 rounded-md text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="disabled" className="font-medium text-xs">
                  DISABLED
                </SelectItem>
                <SelectItem value="1" className="font-medium text-xs">
                  1 ATTEMPT
                </SelectItem>
                <SelectItem value="5" className="font-medium text-xs">
                  5 ATTEMPTS
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Lockout Interval
            </Label>
            <Select defaultValue="disabled">
              <SelectTrigger className="h-9 font-medium border-border bg-muted/10 rounded-md text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="disabled" className="font-medium text-xs">
                  DISABLED
                </SelectItem>
                <SelectItem value="5" className="font-medium text-xs">
                  5 MINUTES
                </SelectItem>
                <SelectItem value="60" className="font-medium text-xs">
                  1 HOUR
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Database Engine Version
          </Label>
          <Input
            placeholder="V14.5.2-STABLE"
            className="h-9 border-border bg-muted/10 rounded-md font-medium max-w-sm placeholder:text-muted-foreground/40 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-8 py-2">
          <ToggleField label="Query Audit Logs" />
          <ToggleField label="DML Snapshot" />
        </div>

        <div className="grid grid-cols-2 gap-8 py-2">
          <ToggleField
            label="Read Only Mode"
            checked={isReadOnly}
            onCheckedChange={setIsReadOnly}
          />
        </div>

        <PermissionsSection />
        
        {/* Connection Pooling Section */}
        {activeConn.type !== 'mongodb' && (
          <PoolingSection 
            {...pooling}
            onChange={handlePoolingChange}
          />
        )}
      </section>

      {/* SSL / SSH */}
      <SecuritySection sslMode={sslMode} onSslModeChange={setSslMode} />
    </div>
  );
}
