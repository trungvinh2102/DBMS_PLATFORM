/**
 * @file ConnectionConfig.tsx
 * @description Connection configuration and detail view component.
 *
 * @example
 * <ConnectionConfig activeConn={conn} onBack={() => ...} />
 */

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Database } from "lucide-react";
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
} from "./ConfigSections";

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
        <EnvironmentSection />

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
            <Input className="h-10 border-border bg-muted/10 rounded-md font-medium text-xm" />
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

        <PermissionsSection />

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

      <SecuritySection />
    </div>
  );
}
