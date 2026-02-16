/**
 * @file ConnectionConfig.tsx
 * @description Connection configuration component utilizing clean architecture and tabs.
 * Manages general settings, access control, and security for a database connection.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  Save,
  Activity,
  Shield,
  Server,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DataSource } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseAccessControl } from "./DatabaseAccessControl";
import { cn } from "@/lib/utils";

interface ConnectionConfigProps {
  activeConn: DataSource;
  onBack: () => void;
}

export function ConnectionConfig({
  activeConn,
  onBack,
}: ConnectionConfigProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Record<string, any>>({
    ...activeConn.config,
    // Set defaults if missing to ensure UI is controlled
    host: activeConn.config?.host || "localhost",
    port: activeConn.config?.port || 5432,
    database: activeConn.config?.database || "",
    user: activeConn.config?.user || "",
    // Advanced defaults
    pool_size: activeConn.config?.pool_size || 5,
    max_overflow: activeConn.config?.max_overflow || 10,
    connect_timeout: activeConn.config?.connect_timeout || 10,
    idle_timeout: activeConn.config?.idle_timeout || 300,
    ssl_mode: activeConn.config?.ssl_mode || "disable",
    use_ssh: activeConn.config?.use_ssh || false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DataSource>) => databaseApi.update(data),
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
      config: config,
      databaseName: activeConn.databaseName, // Ensure required fields are present if needed
    });
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 w-full p-6">
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
            <h2 className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
              {activeConn.databaseName}{" "}
              <span className="text-muted-foreground">/</span> Configuration
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground font-medium ml-10">
            Manage connection parameters, pooling, and security policies.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-9 px-4 font-semibold uppercase tracking-wide text-[11px] border-border hover:bg-muted/10 gap-2"
            onClick={() => router.push(`/sqllab?ds=${activeConn.id}`)}
          >
            <Database className="h-3.5 w-3.5" />
            SQL Lab
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="h-9 px-4 font-semibold uppercase tracking-wide text-[11px] gap-2 min-w-35"
          >
            {updateMutation.isPending ? (
              <Activity className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {updateMutation.isPending ? "Saving..." : "Commit Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-8 w-full justify-start border-b border-border/50 bg-transparent p-0 rounded-none h-auto gap-6">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md px-2 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground transition-all"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="pooling"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md px-2 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground transition-all"
          >
            Connection Pooling
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md px-2 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground transition-all"
          >
            Security & TLS
          </TabsTrigger>
          <TabsTrigger
            value="access"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-md px-2 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-foreground transition-all"
          >
            Access Control
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent
          value="general"
          className="space-y-8 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 space-y-6">
              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Server className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-tight">
                      Connection Details
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Core credentials and addressing
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Host
                    </Label>
                    <Input
                      value={config.host}
                      onChange={(e) => updateConfig("host", e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Port
                    </Label>
                    <Input
                      value={config.port}
                      onChange={(e) => updateConfig("port", e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Database
                    </Label>
                    <Input
                      value={config.database}
                      onChange={(e) => updateConfig("database", e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      User
                    </Label>
                    <Input
                      value={config.user}
                      onChange={(e) => updateConfig("user", e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={config.password || ""}
                      onChange={(e) => updateConfig("password", e.target.value)}
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-4 space-y-6">
              <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="h-8 w-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-tight">
                      Timeouts
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Latency and keep-alive settings
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Connect Timeout (s)
                    </Label>
                    <Input
                      type="number"
                      value={config.connect_timeout}
                      onChange={(e) =>
                        updateConfig(
                          "connect_timeout",
                          parseInt(e.target.value),
                        )
                      }
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Idle Timeout (s)
                    </Label>
                    <Input
                      type="number"
                      value={config.idle_timeout}
                      onChange={(e) =>
                        updateConfig("idle_timeout", parseInt(e.target.value))
                      }
                      className="font-mono text-sm bg-muted/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Pooling Tab */}
        <TabsContent
          value="pooling"
          className="space-y-8 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="bg-card border border-border/50 rounded-xl p-8 shadow-sm space-y-8 max-w-3xl">
            <div className="flex items-center gap-4 border-b border-border/50 pb-6">
              <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  Connection Pooling
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Optimize performance by maintaining active connections.
                  <span className="text-emerald-500 font-medium ml-1">
                    Current Load: Low
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold text-foreground">
                    Pool Size
                  </Label>
                  <span className="text-xs font-mono bg-muted py-1 px-2 rounded-md border border-border">
                    {config.pool_size} Connections
                  </span>
                </div>
                <Slider
                  value={[config.pool_size]}
                  max={100}
                  min={1}
                  step={1}
                  onValueChange={(vals) =>
                    updateConfig(
                      "pool_size",
                      Array.isArray(vals) ? vals[0] : vals,
                    )
                  }
                  className="py-2"
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of connections to keep open inside the pool. Higher
                  values increase performance but consume more server memory.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold text-foreground">
                    Max Overflow
                  </Label>
                  <span className="text-xs font-mono bg-muted py-1 px-2 rounded-md border border-border">
                    {config.max_overflow} Connections
                  </span>
                </div>
                <Slider
                  value={[config.max_overflow]}
                  max={50}
                  min={0}
                  step={1}
                  onValueChange={(vals) =>
                    updateConfig(
                      "max_overflow",
                      Array.isArray(vals) ? vals[0] : vals,
                    )
                  }
                  className="py-2"
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of connections allowed to be created beyond the pool
                  size during high traffic spikes.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent
          value="security"
          className="space-y-8 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="bg-card border border-border/50 rounded-xl p-8 shadow-sm space-y-8 max-w-3xl">
            <div className="flex items-center gap-4 border-b border-border/50 pb-6">
              <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-base font-bold uppercase tracking-tight">
                  Security & Encryption
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure SSL modes and SSH tunneling for secure access.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                  SSL Mode
                </Label>
                <Select
                  value={config.ssl_mode}
                  onValueChange={(v) => updateConfig("ssl_mode", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select SSL Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disable">Disable</SelectItem>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="prefer">Prefer</SelectItem>
                    <SelectItem value="require">Require</SelectItem>
                    <SelectItem value="verify-ca">Verify-CA</SelectItem>
                    <SelectItem value="verify-full">Verify-Full</SelectItem>
                  </SelectContent>
                </Select>
                {config.ssl_mode === "disable" && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Using non-SSL connections is not recommended for
                      production.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/10">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">
                    Enable SSH Tunnel
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Route connection through a bastion host
                  </p>
                </div>
                <Switch
                  checked={config.use_ssh}
                  onCheckedChange={(checked) =>
                    updateConfig("use_ssh", checked)
                  }
                />
              </div>

              {config.use_ssh && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      SSH Host
                    </Label>
                    <Input
                      value={config.ssh_host || ""}
                      onChange={(e) => updateConfig("ssh_host", e.target.value)}
                      placeholder="bastion.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      SSH Port
                    </Label>
                    <Input
                      value={config.ssh_port || "22"}
                      onChange={(e) => updateConfig("ssh_port", e.target.value)}
                      placeholder="22"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                      SSH User
                    </Label>
                    <Input
                      value={config.ssh_user || ""}
                      onChange={(e) => updateConfig("ssh_user", e.target.value)}
                      placeholder="ec2-user"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Access Tab (Existing Component) */}
        <TabsContent
          value="access"
          className="animate-in slide-in-from-bottom-2 duration-300"
        >
          <DatabaseAccessControl activeConn={activeConn} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
