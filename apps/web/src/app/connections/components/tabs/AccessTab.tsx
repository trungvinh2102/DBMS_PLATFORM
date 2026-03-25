/**
 * @file AccessTab.tsx
 * @description Access control and environment settings for database connections.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Ban, LogIn, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AccessTabProps {
  environment: string;
  onEnvironmentChange: (value: string) => void;
  isReadOnly: boolean;
  onReadOnlyChange: (value: boolean) => void;
  accessConfig: any;
  onAccessConfigChange: (config: any) => void;
}

export function AccessTab({ 
  environment, 
  onEnvironmentChange, 
  isReadOnly, 
  onReadOnlyChange, 
  accessConfig, 
  onAccessConfigChange 
}: AccessTabProps) {
  const handleChange = (field: string, value: any) => {
    onAccessConfigChange({ ...accessConfig, [field]: value });
  };

  const getEnvBadge = (env: string) => {
    switch (env) {
      case "PRODUCTION": return "bg-red-500/10 text-red-600 border-red-500/30";
      case "STAGING": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      default: return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-8">
        {/* Environment & Metadata */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <Monitor className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Main Policy</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Critical environment settings</p>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Deployment Level</Label>
                <Badge variant="outline" className={`text-[10px] font-bold ${getEnvBadge(environment)}`}>
                  {environment}
                </Badge>
              </div>
              <Select value={environment} onValueChange={(val) => val && onEnvironmentChange(val)}>
                <SelectTrigger className="h-10 bg-background border-border/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCTION" className="font-bold text-red-500">PRODUCTION</SelectItem>
                  <SelectItem value="STAGING" className="font-bold text-amber-500">STAGING</SelectItem>
                  <SelectItem value="DEVELOPMENT" className="font-bold text-emerald-500">DEVELOPMENT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-background border border-border/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold">Read-Only Mode</Label>
                <p className="text-[9px] text-muted-foreground">Prevent any DML/DDL operations</p>
              </div>
              <Switch checked={isReadOnly} onCheckedChange={onReadOnlyChange} />
            </div>
          </div>
        </div>

        {/* Access Windows */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-sm">
              <Clock className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Access Windows</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Define when access is allowed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Start Time</Label>
              <Input 
                type="time" 
                value={accessConfig.start_time || ""} 
                onChange={(e) => handleChange("start_time", e.target.value)} 
                className="h-9 bg-background border-border/50 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">End Time</Label>
              <Input 
                type="time" 
                value={accessConfig.end_time || ""} 
                onChange={(e) => handleChange("end_time", e.target.value)} 
                className="h-9 bg-background border-border/50 text-xs"
              />
            </div>
            <div className="space-y-2 col-span-2">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Weekday Restrictions</Label>
                <p className="text-[9px] text-muted-foreground mb-2">Access denied on these days</p>
                <div className="flex gap-2">
                    {['S','M','T','W','T','F','S'].map((day, i) => (
                        <button 
                            key={i}
                            className={`h-7 w-7 rounded-md border border-border text-[10px] font-bold flex items-center justify-center transition-all
                                ${accessConfig.denied_days?.includes(i) ? 'bg-red-500 text-white' : 'hover:bg-muted'}`}
                            onClick={() => {
                                const days = accessConfig.denied_days || [];
                                const newDays = days.includes(i) ? days.filter((d: number) => d !== i) : [...days, i];
                                handleChange("denied_days", newDays);
                            }}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Security & Failures */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 shadow-sm">
              <Ban className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Security Limits</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Automatic lockout policies</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Max Failed Logins</Label>
              <Select 
                value={accessConfig.max_failed_logins || "5"} 
                onValueChange={(val) => val && handleChange("max_failed_logins", val)}
              >
                <SelectTrigger className="h-9 bg-background border-border/50 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 ATTEMPTS</SelectItem>
                  <SelectItem value="5">5 ATTEMPTS</SelectItem>
                  <SelectItem value="10">10 ATTEMPTS</SelectItem>
                  <SelectItem value="0">UNLIMITED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Lockout Duration</Label>
              <Select 
                value={accessConfig.lockout_duration || "15"} 
                onValueChange={(val) => val && handleChange("lockout_duration", val)}
              >
                <SelectTrigger className="h-9 bg-background border-border/50 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 MINUTES</SelectItem>
                  <SelectItem value="15">15 MINUTES</SelectItem>
                  <SelectItem value="60">1 HOUR</SelectItem>
                  <SelectItem value="1440">24 HOURS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Governance */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-500/10 rounded-xl flex items-center justify-center border border-slate-500/20 shadow-sm">
              <LogIn className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Audit & Governance</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Logging and traceability</p>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-muted/10 border border-border/40 rounded-xl overflow-hidden relative">
            <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    Mandatory Query Audit Logs for all users matching the compliance profile.
                </p>
                <Switch checked={accessConfig.audit_enabled} onCheckedChange={(val) => handleChange("audit_enabled", val)} />
            </div>
            <div className="h-1 w-full bg-border/20 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 w-1/3 transition-all" />
            </div>
            <p className="text-[9px] text-muted-foreground italic">Coverage: SELECT, DML operations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
