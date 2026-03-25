/**
 * @file GeneralTab.tsx
 * @description Core connection settings for relational databases.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Database, Server, Hash, User, Lock } from "lucide-react";

interface GeneralTabProps {
  config: any;
  onChange: (field: string, value: any) => void;
}

export function GeneralTab({ config, onChange }: GeneralTabProps) {
  return (
    <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
            placeholder="e.g. localhost or 1.2.3.4"
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

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Database Name</Label>
          </div>
          <Input 
            value={config.database || ""} 
            onChange={(e) => onChange("database", e.target.value)} 
            className="h-10 bg-muted/5 border-border/50 focus:border-primary/50 transition-all font-medium text-sm"
            placeholder="e.g. postgres"
          />
        </div>
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
            placeholder="e.g. admin"
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
      </div>
    </div>
  );
}
