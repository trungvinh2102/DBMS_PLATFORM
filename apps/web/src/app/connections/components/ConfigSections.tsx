/**
 * @file ConfigSections.tsx
 * @description Major sections for database connection configuration.
 */

import { Clock, Key, Lock, Database } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleField, CheckboxLabel } from "./ConfigFields";

export function EnvironmentSection() {
  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
          Environment
        </Label>
        <Select defaultValue="DEVELOPMENT">
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
  );
}

interface SecuritySectionProps {
  sslMode?: string;
  onSslModeChange?: (value: string) => void;
}

export function SecuritySection({
  sslMode,
  onSslModeChange,
}: SecuritySectionProps = {}) {
  return (
    <div className="pt-8 border-t border-border">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-muted/10 rounded-full flex items-center justify-center border border-border">
          <Key className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-base font-bold uppercase tracking-tight">
            SSL / SSH Setting
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium">
            Encryption tunnels and certificate authority
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            SSL Mode
          </Label>
          <Select
            value={sslMode || "DISABLE"}
            onValueChange={(val) => val && onSslModeChange?.(val)}
          >
            <SelectTrigger className="h-9 font-medium border-border bg-muted/10 rounded-md text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="DISABLE" className="font-medium text-xs">
                DISABLE
              </SelectItem>
              <SelectItem value="REQUIRE" className="font-medium text-xs">
                REQUIRE
              </SelectItem>
              <SelectItem value="VERIFY_CA" className="font-medium text-xs">
                VERIFY CA
              </SelectItem>
              <SelectItem value="VERIFY_FULL" className="font-medium text-xs">
                VERIFY FULL
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            SSH Tunnel
          </Label>
          <Button
            variant="outline"
            className="h-9 w-full justify-start font-semibold uppercase tracking-wide text-muted-foreground border-border bg-muted/5 hover:bg-muted/10 text-[10px]"
          >
            <Lock className="mr-2 h-3 w-3" /> Configure Bastion Host
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PermissionsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 border border-border bg-muted/10 rounded-md group cursor-pointer hover:bg-muted/20 transition-colors">
        <Checkbox id="purpose" className="h-4 w-4 border-muted-foreground/30" />
        <div className="grid gap-0.5">
          <label
            htmlFor="purpose"
            className="text-[12px] font-semibold uppercase text-foreground/80 cursor-pointer group-hover:text-foreground transition-colors"
          >
            Action Purpose Required
          </label>
          <p className="text-[10px] text-muted-foreground font-medium">
            Mandatory justification for every SQL execution
          </p>
        </div>
      </div>

      <div className="bg-muted/10 border border-border rounded-lg p-5 grid grid-cols-2 gap-y-3 gap-x-6">
        <CheckboxLabel label="SQL Execution" />
        <CheckboxLabel label="Import Schema" />
        <CheckboxLabel label="Export Schema" />
        <CheckboxLabel label="Import Data" />
        <CheckboxLabel label="Export Data" />
      </div>
    </div>
  );
}

interface PoolingSectionProps {
  pool_size: number;
  max_overflow: number;
  pool_timeout: number;
  pool_recycle: number;
  onChange: (field: string, value: number) => void;
}

export function PoolingSection({
  pool_size,
  max_overflow,
  pool_timeout,
  pool_recycle,
  onChange,
}: PoolingSectionProps) {
  return (
    <div className="pt-8 border-t border-border">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-muted/10 rounded-full flex items-center justify-center border border-border">
          <Database className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-base font-bold uppercase tracking-tight">
            Connection Pooling
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium">
            Performance tuning and resource management
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Pool Size
          </Label>
          <Input
            type="number"
            value={pool_size}
            onChange={(e) => onChange("pool_size", parseInt(e.target.value) || 5)}
            className="h-9 border-border bg-muted/10 rounded-md font-medium text-xs"
          />
          <p className="text-[9px] text-muted-foreground">Number of permanent connections</p>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Max Overflow
          </Label>
          <Input
            type="number"
            value={max_overflow}
            onChange={(e) => onChange("max_overflow", parseInt(e.target.value) || 10)}
            className="h-9 border-border bg-muted/10 rounded-md font-medium text-xs"
          />
          <p className="text-[9px] text-muted-foreground">Allowable burst above pool size</p>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Timeout (s)
          </Label>
          <Input
            type="number"
            value={pool_timeout}
            onChange={(e) => onChange("pool_timeout", parseInt(e.target.value) || 30)}
            className="h-9 border-border bg-muted/10 rounded-md font-medium text-xs"
          />
          <p className="text-[9px] text-muted-foreground">Seconds to wait for a connection</p>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Recycle (s)
          </Label>
          <Input
            type="number"
            value={pool_recycle}
            onChange={(e) => onChange("pool_recycle", parseInt(e.target.value) || 1800)}
            className="h-9 border-border bg-muted/10 rounded-md font-medium text-xs"
          />
          <p className="text-[9px] text-muted-foreground">Age at which connections close</p>
        </div>
      </div>
    </div>
  );
}

