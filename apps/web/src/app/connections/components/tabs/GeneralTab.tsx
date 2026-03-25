import { Database, Server, Hash, User, Lock, Zap, Link2, Settings2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChangeEvent } from "react";

interface GeneralTabProps {
  dbType?: string;
  config: any;
  onChange: (field: string, value: any) => void;
}

export function GeneralTab({ dbType, config, onChange }: GeneralTabProps) {
  const isClickhouse = dbType === "clickhouse";
  const isMongodb = dbType === "mongodb";
  const isRedis = dbType === "redis";
  const useUri = config.useUri || false;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {isClickhouse && (
        <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ClickHouse Protocol Settings</span>
            </div>
            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-orange-500/20">
              <Button
                variant={config.protocol !== "native" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md"
                onClick={() => {
                  onChange("protocol", "http");
                  if (!config.port || ["9000", "9440", "8123", "8443"].includes(config.port.toString())) {
                    onChange("port", config.secure ? "8443" : "8123");
                  }
                }}
              >
                HTTP
              </Button>
              <Button
                variant={config.protocol === "native" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md"
                onClick={() => {
                  onChange("protocol", "native");
                  if (!config.port || ["9000", "9440", "8123", "8443"].includes(config.port.toString())) {
                    onChange("port", config.secure ? "9440" : "9000");
                  }
                }}
              >
                NATIVE
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold">Secure Connection (TLS/SSL)</Label>
              <p className="text-[10px] text-muted-foreground">Encryption for cloud and production servers</p>
            </div>
            <Switch 
              checked={config.secure || false} 
              onCheckedChange={(checked: boolean) => {
                onChange("secure", checked);
                // Update port based on protocol if it's the default
                if (config.protocol === "native") {
                  onChange("port", checked ? "9440" : "9000");
                } else {
                  onChange("port", checked ? "8443" : "8123");
                }
              }}
            />
          </div>
        </div>
      )}

      {isMongodb && (
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">MongoDB Connection Mode</span>
            </div>
            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-emerald-500/20">
              <Button
                variant={!useUri ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md"
                onClick={() => onChange("useUri", false)}
              >
                STANDARD
              </Button>
              <Button
                variant={useUri ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md"
                onClick={() => onChange("useUri", true)}
              >
                CONNECTION STRING
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold">Direct Connection</Label>
              <p className="text-[10px] text-muted-foreground">Force direct connection to a single node</p>
            </div>
            <Switch 
              checked={config.directConnection || false} 
              onCheckedChange={(checked: boolean) => onChange("directConnection", checked)}
            />
          </div>
        </div>
      )}

      {dbType === "redis" && (
        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Redis Configuration Mode</span>
            </div>
            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-red-500/20">
              <Button
                variant={config.redisMode !== "cluster" && config.redisMode !== "sentinel" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md transition-all"
                onClick={() => onChange("redisMode", "standalone")}
              >
                STANDALONE
              </Button>
              <Button
                variant={config.redisMode === "cluster" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md transition-all"
                onClick={() => onChange("redisMode", "cluster")}
              >
                CLUSTER
              </Button>
              <Button
                variant={config.redisMode === "sentinel" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[10px] font-bold px-3 rounded-md transition-all"
                onClick={() => onChange("redisMode", "sentinel")}
              >
                SENTINEL
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold">Secure Connection (SSL/TLS)</Label>
              <p className="text-[10px] text-muted-foreground">Encryption for cloud Redis instances</p>
            </div>
            <Switch 
              checked={config.secure || false} 
              onCheckedChange={(checked: boolean) => onChange("secure", checked)}
            />
          </div>
        </div>
      )}

      {isMongodb && useUri ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
           <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Connection URI</Label>
            </div>
            <textarea
              value={config.uri || ""}
              onChange={(e) => onChange("uri", e.target.value)}
              className="w-full min-h-[100px] p-3 bg-muted/5 border border-border/50 rounded-xl focus:border-primary/50 transition-all font-mono text-xs outline-none"
              placeholder="mongodb://username:password@host:port/database?authSource=admin"
            />
            <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-[10px] text-amber-600 font-medium"> Ensure special characters in your password are URL encoded (e.g. @ becomes %40)</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Host Address</Label>
            </div>
            <Input 
              value={config.host || ""} 
              onChange={(e) => onChange("host", e.target.value)} 
              className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
              placeholder="e.g. localhost or clickhouse-cloud.com"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Port</Label>
            </div>
            <Input 
              type="number" 
              value={config.port || ""} 
              onChange={(e) => onChange("port", e.target.value)} 
              className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
            />
          </div>

          {!isRedis && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Database Name</Label>
              </div>
              <Input 
                value={config.database || ""} 
                onChange={(e) => onChange("database", e.target.value)} 
                className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
                placeholder={isMongodb ? "admin" : "default"}
              />
            </div>
          )}

          {isRedis && (
            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Database Index</Label>
              </div>
              <Input 
                type="number"
                min={0}
                max={15}
                value={config.database || "0"} 
                onChange={(e) => onChange("database", e.target.value)} 
                className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
                placeholder="0-15"
              />
            </div>
          )}

          {isMongodb && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Replica Set</Label>
              </div>
              <Input 
                value={config.replicaSet || ""} 
                onChange={(e) => onChange("replicaSet", e.target.value)} 
                className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
                placeholder="e.g. rs0"
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Username</Label>
            </div>
            <Input 
              value={config.user || ""} 
              onChange={(e) => onChange("user", e.target.value)} 
              className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
              placeholder="e.g. default"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Password</Label>
            </div>
            <Input 
              type="password" 
              value={config.password || ""} 
              onChange={(e) => onChange("password", e.target.value)} 
              className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
              placeholder={config.password === '********' ? '********' : '••••••••'}
            />
            {config.password === '********' && (
              <p className="text-[10px] text-muted-foreground/60 italic">
                Encrypted password. Type to change.
              </p>
            )}
          </div>

          {isMongodb && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Auth Source</Label>
              </div>
              <Input 
                value={config.authSource || ""} 
                onChange={(e) => onChange("authSource", e.target.value)} 
                className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
                placeholder="e.g. admin"
              />
            </div>
          )}

          {isRedis && config.redisMode === "sentinel" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Master Name</Label>
              </div>
              <Input 
                value={config.masterName || ""} 
                onChange={(e) => onChange("masterName", e.target.value)} 
                className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
                placeholder="e.g. mymaster"
              />
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
}
