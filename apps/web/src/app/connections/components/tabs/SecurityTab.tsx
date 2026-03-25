/**
 * @file SecurityTab.tsx
 * @description Security and encryption settings for database connections.
 */

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Key, Shield, Lock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SecurityTabProps {
  sslMode: string;
  onSslModeChange: (value: string) => void;
  sshConfig?: any;
  onSshConfigChange: (config: any) => void;
}

export function SecurityTab({ 
  sslMode, 
  onSslModeChange, 
  sshConfig, 
  onSshConfigChange 
}: SecurityTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-8">
        {/* SSL / TLS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">SSL / Encryption</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Protect data in transit</p>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">SSL Mode</Label>
              <Select value={sslMode} onValueChange={(val) => val && onSslModeChange(val)}>
                <SelectTrigger className="h-10 bg-background border-border/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISABLE">DISABLE</SelectItem>
                  <SelectItem value="REQUIRE">REQUIRE</SelectItem>
                  <SelectItem value="VERIFY_CA">VERIFY CA</SelectItem>
                  <SelectItem value="VERIFY_FULL">VERIFY FULL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
              Choosing "VERIFY_FULL" is recommended for production environments for maximum security.
            </p>
          </div>
        </div>

        {/* SSH Tunneling */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 shadow-sm">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">SSH Tunneling</h3>
              <p className="text-[10px] text-muted-foreground font-medium">Access private databases</p>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/10 border border-border/40 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={sshConfig?.enabled ? "default" : "outline"} className="text-[10px]">
                  {sshConfig?.enabled ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => onSshConfigChange({ ...sshConfig, enabled: !sshConfig?.enabled })}
              >
                {sshConfig?.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Use an SSH Bastion Host to securely connect to databases located inside private network subnets.
            </p>

            <Button 
                disabled={!sshConfig?.enabled}
                variant="outline" 
                className="w-full h-9 border-dashed border-border flex items-center justify-center gap-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              <Key className="h-3.5 w-3.5" />
              Manage SSH Identity Keys
            </Button>
          </div>
        </div>
      </div>

      {/* Network Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-sm">
            <Globe className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Network & IP Controls</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Whitelisting and firewall rules</p>
          </div>
        </div>

        <div className="p-6 bg-muted/5 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-center opacity-70">
          <Badge variant="secondary" className="text-[9px]">ENTERPRISE PLAN ONLY</Badge>
          <p className="text-sm font-semibold">IP Whitelisting & Static Outbound IPs</p>
          <p className="text-[11px] text-muted-foreground max-w-sm">
            Restrict connections to only allow verified incoming traffic or route through static exit nodes.
          </p>
        </div>
      </div>
    </div>
  );
}
