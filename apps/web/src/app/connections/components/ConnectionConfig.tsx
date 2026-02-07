/**
 * @file ConnectionConfig.tsx
 * @description Connection configuration and detail view component.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Key, Shield, Lock, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ToggleFieldProps {
  label: string;
}

function ToggleField({ label }: ToggleFieldProps) {
  return (
    <div className="space-y-3">
      <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="flex bg-muted/20 p-1 border border-border w-fit rounded-md">
        <button className="px-3 py-1 text-[10px] font-semibold uppercase bg-background text-foreground shadow-sm border border-border transition-all rounded-sm">
          On
        </button>
        <button className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground hover:text-foreground transition-all">
          Off
        </button>
      </div>
    </div>
  );
}

interface CheckboxLabelProps {
  label: string;
}

function CheckboxLabel({ label }: CheckboxLabelProps) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <Checkbox className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:text-background" />
      <span className="text-[12px] font-medium text-muted-foreground group-hover:text-foreground transition-opacity">
        {label}
      </span>
    </div>
  );
}

interface ConnectionConfigProps {
  activeConn: any;
  onBack: () => void;
}

export function ConnectionConfig({
  activeConn,
  onBack,
}: ConnectionConfigProps) {
  const router = useRouter();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-muted/10 rounded-md transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <h2 className="text-xl font-bold tracking-tight uppercase">
              Configuration
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground font-medium ml-10">
            Tweak system parameters and access rules
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-8 px-3 font-semibold uppercase tracking-wide text-[10px] border-border hover:bg-muted/10 rounded-md gap-2"
            onClick={() => router.push(`/sqllab?connectionId=${activeConn.id}`)}
          >
            <Database className="h-3.5 w-3.5" />
            Explore Data
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 font-semibold uppercase tracking-wide text-[10px] border-border hover:bg-muted/10 rounded-md"
          >
            Export Specs
          </Button>
          <Button className="h-8 px-3 font-semibold uppercase tracking-wide text-[10px] bg-foreground text-background hover:bg-foreground/90 rounded-md shadow-sm">
            Commit Changes
          </Button>
        </div>
      </div>

      <section className="space-y-8 w-full">
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
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Weekday Access Denied
          </Label>
          <Input className="h-9 border-border bg-muted/10 rounded-md font-medium text-xm" />
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

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 border border-border bg-muted/10 rounded-md group cursor-pointer hover:bg-muted/20 transition-colors">
            <Checkbox
              id="purpose"
              className="h-4 w-4 border-muted-foreground/30"
            />
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

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Description & Meta
          </Label>
          <textarea
            className="w-full min-h-24 rounded-md border border-border bg-muted/10 p-3 text-xs font-medium focus:outline-none focus:border-blue-500 transition-all placeholder:text-muted-foreground/40 text-foreground resize-none"
            placeholder="PRIMARY ANALYTICS CLUSTER FOR REGION_01..."
          />
        </div>
      </section>

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
            <Select defaultValue="DISABLE">
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
    </div>
  );
}
