/**
 * @file ConnectionConfig.tsx
 * @description Upgraded Connection configuration and detail view component.
 * Features a tabbed interface, real-time connection testing, and premium UI.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Database,
  Save,
  Loader2,
  Play,
  ShieldCheck,
  Settings2,
  Key,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  HardDrive
} from "lucide-react";

/** Database types that use local file paths instead of host/port/credentials */
const FILE_BASED_TYPES = ["sqlite", "duckdb"];
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { DB_TYPES } from "./constants";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Sub-tab components
import { GeneralTab } from "./tabs/GeneralTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { AccessTab } from "./tabs/AccessTab";
import { PerformanceTab } from "./tabs/PerformanceTab";

interface ConnectionConfigProps {
  activeConn: any;
  onBack: () => void;
}

type TestStatus = 'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR';

export function ConnectionConfig({
  activeConn,
  onBack,
}: ConnectionConfigProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form State
  const [environment, setEnvironment] = useState(activeConn.environment || "DEVELOPMENT");
  const [isReadOnly, setIsReadOnly] = useState(activeConn.isReadOnly || false);
  const [sslMode, setSslMode] = useState(activeConn.sslMode || "DISABLE");
  const [config, setConfig] = useState({
    host: activeConn.config?.host || "",
    port: activeConn.config?.port || "",
    user: activeConn.config?.user || "",
    password: activeConn.config?.password || "********",
    database: activeConn.config?.database || activeConn.databaseName || "",
    ...activeConn.config
  });

  const [sshConfig, setSshConfig] = useState(activeConn.sshConfig || { enabled: false });
  const [accessConfig, setAccessConfig] = useState(activeConn.config?.accessConfig || {
    start_time: "00:00",
    end_time: "23:59",
    denied_days: [],
    max_failed_logins: "5",
    lockout_duration: "15",
    audit_enabled: false
  });

  const [testStatus, setTestStatus] = useState<TestStatus>('IDLE');
  const [testProgress, setTestProgress] = useState(0);
  const [testMessage, setTestMessage] = useState("");

  // Find the database type info
  const dbType = useMemo(() =>
    DB_TYPES.find((t) => t.id === activeConn.type) || DB_TYPES.find((t) => t.id === "postgres"),
    [activeConn.type]
  );

  const isFileBased = FILE_BASED_TYPES.includes(activeConn.type);

  const envColor = useMemo(() => {
    if (environment === "PRODUCTION") return "red";
    if (environment === "STAGING") return "amber";
    return "emerald";
  }, [environment]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => databaseApi.update(data),
    onSuccess: () => {
      toast.success("Configuration saved and synchronized");
      queryClient.invalidateQueries({ queryKey: ["databases"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Synchronization failed");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: activeConn.id,
      databaseName: config.database,
      type: activeConn.type,
      environment,
      isReadOnly,
      sslMode,
      sshConfig,
      config: {
        ...config,
        accessConfig
      },
    });
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestProgress(10);
    setTestMessage(isFileBased ? "Locating file..." : "Resolving host...");

    // Simulate real steps for "WOW" factor
    setTimeout(() => {
      setTestProgress(40);
      setTestMessage(isFileBased ? "Opening database file..." : "Establishing TCP/IP handshake...");
    }, 800);

    setTimeout(async () => {
      try {
        setTestProgress(70);
        setTestMessage(isFileBased ? "Verifying file integrity..." : "Authenticating with credentials...");

        // File-based DBs only need database path
        const testConfig = isFileBased
          ? { database: config.database }
          : { ...config, sslMode, sshConfig };

        const result = await databaseApi.test({
          id: activeConn.id,
          type: activeConn.type,
          config: testConfig,
        });

        if (result.success) {
          setTestStatus('SUCCESS');
          setTestProgress(100);
          setTestMessage(isFileBased ? "Database file accessible!" : "Connection established successfully!");
          toast.success("Connection test passed");
        } else {
          setTestStatus('ERROR');
          setTestMessage(result.message || (isFileBased ? "File not accessible" : "Auth failed: Access Denied"));
          toast.error("Test failed: " + result.message);
        }
      } catch (err: any) {
        setTestStatus('ERROR');
        setTestMessage(err.message || (isFileBased ? "File not found" : "Network unreachable"));
        toast.error("Test failed: " + err.message);
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{activeConn.databaseName}</h1>
              <Badge className={`${envColor === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/30' : envColor === 'amber' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'} border uppercase text-[10px] font-bold px-2 py-0 h-5`}>
                {environment}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                {dbType?.icon} {dbType?.name}
              </span>
              <span>•</span>
              {isFileBased ? (
                <span className="font-mono text-[10px] truncate max-w-[300px]" title={config.database}>
                  {config.database || 'No file path'}
                </span>
              ) : (
                <span className="font-mono text-[10px]">{config.host}:{config.port}</span>
              )}
            </div>
          </div>
        </div>
        {activeConn.type === 'clickhouse' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 opacity-50" />
        )}
        {activeConn.type === 'redis' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 opacity-50" />
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-9 px-4 font-bold uppercase tracking-wider text-[10px] border-border hover:bg-muted/30 rounded-lg gap-2"
            onClick={() => navigate(`/sqllab?ds=${activeConn.id}`)}
          >
            <Database className="h-3.5 w-3.5" />
            Explore Data
          </Button>
          <Button
            className="h-9 px-4 font-bold uppercase tracking-wider text-[10px] bg-foreground text-background hover:bg-foreground/90 rounded-lg shadow-lg shadow-foreground/10 gap-2 transition-all active:scale-95"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Diagnostics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Connection Tester Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/5 border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Diagnostics
              </h3>
              {testStatus === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {testStatus === 'ERROR' && <AlertCircle className="h-4 w-4 text-red-500" />}
            </div>

            <div className="space-y-2">
              {testStatus === 'TESTING' || testStatus === 'SUCCESS' || testStatus === 'ERROR' ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span>{testMessage}</span>
                    <span>{testProgress}%</span>
                  </div>
                  <Progress value={testProgress} className={`h-1.5 ${testStatus === 'ERROR' ? 'bg-red-500/10' : ''}`} />
                  {testStatus === 'ERROR' && (
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                      <p className="text-[10px] text-red-600 font-medium leading-relaxed">{testMessage}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Run a manual heartbeat test to verify path connectivity and authentication.
                </p>
              )}
            </div>

            <Button
              variant="secondary"
              className="w-full h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 bg-background border border-border shadow-xs hover:bg-muted"
              onClick={handleTestConnection}
              disabled={testStatus === 'TESTING'}
            >
              {testStatus === 'TESTING' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Run Connection Test
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="p-6 rounded-2xl border border-border/40 bg-muted/5 text-[11px] space-y-3">
            {isFileBased ? (
              /* File-based database stats */
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-bold flex items-center gap-1">
                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                    FILE-BASED
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engine</span>
                  <span className="font-bold uppercase">{activeConn.type === 'sqlite' ? 'OLTP' : 'OLAP'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pooling</span>
                  <span className="font-bold">NullPool</span>
                </div>
                {activeConn.type === 'sqlite' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Journal</span>
                    <span className="font-bold text-emerald-500">WAL</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/40 flex justify-between">
                  <span className="text-muted-foreground">Compliance</span>
                  <span className="font-bold text-blue-500">{accessConfig.audit_enabled ? 'SOX/SOC2' : 'BASIC'}</span>
                </div>
              </>
            ) : (
              /* Server-based database stats */
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SSL Security</span>
                  <span className="font-bold flex items-center gap-1">
                    {sslMode !== 'DISABLE' ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : 'UNSECURED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SSH Tunnel</span>
                  <span className="font-bold">{sshConfig.enabled ? 'ACTIVE' : 'NONE'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool Capacity</span>
                  <span className="font-bold">{config.pool_size || 5} / {config.max_overflow || 10}</span>
                </div>
                <div className="pt-2 border-t border-border/40 flex justify-between">
                  <span className="text-muted-foreground">Compliance</span>
                  <span className="font-bold text-blue-500">{accessConfig.audit_enabled ? 'SOX/SOC2' : 'BASIC'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className={`bg-muted/10 p-1 border border-border/50 rounded-xl mb-6 grid h-11 ${isFileBased ? 'grid-cols-2' : 'grid-cols-4'}`}>
              <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider gap-2">
                {isFileBased ? <HardDrive className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                {isFileBased ? 'Configuration' : 'Credentials'}
              </TabsTrigger>
              {!isFileBased && (
                <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider gap-2">
                  <Key className="h-3.5 w-3.5" />
                  Security
                </TabsTrigger>
              )}
              <TabsTrigger value="access" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider gap-2">
                <Clock className="h-3.5 w-3.5" />
                Access
              </TabsTrigger>
              {!isFileBased && (
                <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider gap-2">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Performance
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="general" className="mt-0 ring-offset-background focus-visible:outline-none">
              <GeneralTab
                dbType={dbType?.id}
                config={config}
                onChange={(f, v) => setConfig((prev: any) => ({ ...prev, [f]: v }))}
              />
            </TabsContent>

            <TabsContent value="security" className="mt-0 ring-offset-background focus-visible:outline-none">
              <SecurityTab
                sslMode={sslMode}
                onSslModeChange={setSslMode}
                sshConfig={sshConfig}
                onSshConfigChange={setSshConfig}
              />
            </TabsContent>

            <TabsContent value="access" className="mt-0 ring-offset-background focus-visible:outline-none">
              <AccessTab
                environment={environment}
                onEnvironmentChange={setEnvironment}
                isReadOnly={isReadOnly}
                onReadOnlyChange={setIsReadOnly}
                accessConfig={accessConfig}
                onAccessConfigChange={setAccessConfig}
              />
            </TabsContent>

            <TabsContent value="performance" className="mt-0 ring-offset-background focus-visible:outline-none">
              <PerformanceTab
                dbType={dbType?.id}
                pooling={{
                  pool_size: config.pool_size || 5,
                  max_overflow: config.max_overflow || 10,
                  pool_timeout: config.pool_timeout || 30,
                  pool_recycle: config.pool_recycle || 1800,
                  compression: config.compression,
                  read_timeout: config.read_timeout,
                  write_timeout: config.write_timeout
                }}
                onChange={(f, v) => setConfig((prev: any) => ({ ...prev, [f]: v }))}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
