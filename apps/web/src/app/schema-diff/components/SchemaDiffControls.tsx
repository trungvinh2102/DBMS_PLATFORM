/**
 * @file SchemaDiffControls.tsx
 * @description Connection and schema selectors for the Schema Diff workflow.
 */

import { ChevronsUpDown, Database, GitCompare, Loader2, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDBName, getDBIcon } from "@/app/sqllab/components/sidebar/sidebar-utils";

import type { DatabaseConnection } from "../types";

interface SchemaDiffControlsProps {
  databases: DatabaseConnection[];
  sourceDatabaseId: string;
  targetDatabaseId: string;
  sourceSchema: string;
  targetSchema: string;
  sourceSchemas: string[];
  targetSchemas: string[];
  includeDestructive: boolean;
  isLoading: boolean;
  isDisabled: boolean;
  onSourceDatabaseChange: (value: string) => void;
  onTargetDatabaseChange: (value: string) => void;
  onSourceSchemaChange: (value: string) => void;
  onTargetSchemaChange: (value: string) => void;
  onIncludeDestructiveChange: (value: boolean) => void;
  onCompare: () => void;
}

const NO_SCHEMA = "__default__";

export function SchemaDiffControls({
  databases,
  sourceDatabaseId,
  targetDatabaseId,
  sourceSchema,
  targetSchema,
  sourceSchemas,
  targetSchemas,
  includeDestructive,
  isLoading,
  isDisabled,
  onSourceDatabaseChange,
  onTargetDatabaseChange,
  onSourceSchemaChange,
  onTargetSchemaChange,
  onIncludeDestructiveChange,
  onCompare,
}: SchemaDiffControlsProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="size-4" />
          Schema comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 lg:grid-cols-[1fr_auto_1fr]">
        <ConnectionPicker
          label="Source"
          value={sourceDatabaseId}
          schemaValue={sourceSchema}
          databases={databases}
          schemas={sourceSchemas}
          onDatabaseChange={onSourceDatabaseChange}
          onSchemaChange={onSourceSchemaChange}
        />

        <div className="hidden items-center justify-center lg:flex">
          <GitCompare className="size-5 text-muted-foreground" />
        </div>

        <ConnectionPicker
          label="Target"
          value={targetDatabaseId}
          schemaValue={targetSchema}
          databases={databases}
          schemas={targetSchemas}
          onDatabaseChange={onTargetDatabaseChange}
          onSchemaChange={onTargetSchemaChange}
        />

        <div className="flex flex-col gap-3 border-t pt-4 lg:col-span-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={includeDestructive}
              onCheckedChange={(value) => onIncludeDestructiveChange(Boolean(value))}
            />
            Include destructive SQL in script
          </label>
          <Button onClick={onCompare} disabled={isDisabled || isLoading}>
            {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlayCircle className="mr-2 size-4" />}
            Compare schemas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectionPicker({
  label,
  value,
  schemaValue,
  databases,
  schemas,
  onDatabaseChange,
  onSchemaChange,
}: {
  label: string;
  value: string;
  schemaValue: string;
  databases: DatabaseConnection[];
  schemas: string[];
  onDatabaseChange: (value: string) => void;
  onSchemaChange: (value: string) => void;
}) {
  const selectedDatabase = databases.find((database) => database.id === value);

  return (
    <div className="grid gap-3">
      <Label className="text-xs font-semibold uppercase text-muted-foreground">{label}</Label>
      <DatabaseDropdown
        value={value}
        label={label}
        databases={databases}
        selectedDatabase={selectedDatabase}
        onDatabaseChange={onDatabaseChange}
      />

      <Select
        value={schemaValue || NO_SCHEMA}
        onValueChange={(next) => {
          if (next) onSchemaChange(next === NO_SCHEMA ? "" : next);
        }}
      >
        <SelectTrigger className="h-9 rounded-xl bg-muted/40 px-3 text-xs font-bold transition-all hover:bg-muted/60">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Database className="size-3.5 shrink-0 text-muted-foreground/60" />
            <SelectValue placeholder="Default schema" className="truncate" />
          </div>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          side="bottom"
          align="start"
          sideOffset={8}
          className="min-w-64 rounded-2xl border-muted-foreground/10 p-1.5 shadow-2xl"
        >
          <SelectItem value={NO_SCHEMA} className="rounded-xl px-3 py-2.5 text-xs font-medium">
            Default schema
          </SelectItem>
          {schemas.map((schema) => (
            <SelectItem key={schema} value={schema} className="rounded-xl px-3 py-2.5 text-xs font-medium">
              {schema}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DatabaseDropdown({
  value,
  label,
  databases,
  selectedDatabase,
  onDatabaseChange,
}: {
  value: string;
  label: string;
  databases: DatabaseConnection[];
  selectedDatabase?: DatabaseConnection;
  onDatabaseChange: (value: string) => void;
}) {
  const activeFormatted = formatDBName(selectedDatabase);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group w-full outline-none">
        <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-border/40 bg-muted/30 p-2 text-left transition-all hover:bg-muted/50">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/80">
            {getDBIcon(selectedDatabase?.type || "")}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span className="w-full truncate text-sm font-bold tracking-tight text-foreground/90">
              {selectedDatabase ? activeFormatted.title : `${label} connection`}
            </span>
            <span className="w-full truncate font-mono text-[10px] font-medium uppercase text-muted-foreground/60">
              {selectedDatabase ? activeFormatted.subtitle : "Not selected"}
            </span>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground/40 transition-opacity group-hover:text-muted-foreground" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="min-w-72 rounded-2xl border-muted-foreground/10 bg-background/95 p-1.5 shadow-2xl backdrop-blur-md"
      >
        {databases.map((database) => {
          const formatted = formatDBName(database);
          return (
            <DropdownMenuItem
              key={database.id}
              onClick={() => onDatabaseChange(database.id)}
              className={cn(
                "m-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                value === database.id ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/50",
              )}
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/20 bg-muted/20">
                {getDBIcon(database.type || "")}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-bold">{formatted.title}</span>
                <span className="truncate font-mono text-[9px] uppercase opacity-40">
                  {formatted.subtitle}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
