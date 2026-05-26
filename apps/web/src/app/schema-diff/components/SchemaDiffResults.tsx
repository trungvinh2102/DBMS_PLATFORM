/**
 * @file SchemaDiffResults.tsx
 * @description Results view for schema changes and generated migration SQL.
 */

import { CheckCircle2, Clipboard, Download, FileCode, ShieldAlert, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { SchemaDiffOperation, SchemaDiffResult } from "../types";

interface SchemaDiffResultsProps {
  result: SchemaDiffResult | null;
}

export function SchemaDiffResults({ result }: SchemaDiffResultsProps) {
  if (!result) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
        No comparison yet.
      </div>
    );
  }

  const copyScript = async () => {
    await navigator.clipboard.writeText(result.migrationScript);
    toast.success("Migration script copied");
  };

  const downloadScript = () => {
    const blob = new Blob([result.migrationScript], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quriodb-schema-migration.sql";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <SummaryStrip result={result} />

      {result.warnings.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          {result.warnings.map((warning) => (
            <div key={warning} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="changes" className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="script">Script</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyScript}>
              <Clipboard className="mr-2 size-4" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadScript}>
              <Download className="mr-2 size-4" />
              SQL
            </Button>
          </div>
        </div>

        <TabsContent value="changes" className="m-0">
          <div className="grid gap-2">
            {result.operations.length === 0 ? (
              <div className="flex min-h-44 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                No schema differences found.
              </div>
            ) : (
              result.operations.map((operation) => (
                <OperationRow key={operation.id} operation={operation} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="script" className="m-0">
          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileCode className="size-4" />
                Migration script
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                value={result.migrationScript}
                readOnly
                spellCheck={false}
                className="min-h-[420px] resize-y font-mono text-xs"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryStrip({ result }: { result: SchemaDiffResult }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryCard label="Total" value={result.summary.total} />
      <SummaryCard label="Add" value={result.summary.added} tone="text-emerald-500" />
      <SummaryCard label="Modify" value={result.summary.modified} tone="text-sky-500" />
      <SummaryCard label="Review/drop" value={result.summary.review + result.summary.destructive} tone="text-amber-500" />
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="rounded-lg" size="sm">
      <CardContent className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-lg font-semibold ${tone || ""}`}>{value}</span>
      </CardContent>
    </Card>
  );
}

function OperationRow({ operation }: { operation: SchemaDiffOperation }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-card p-3 text-sm md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityIcon severity={operation.severity} />
          <span className="font-medium">{operation.summary}</span>
          <Badge variant="secondary" className="rounded-md uppercase">
            {operation.action}
          </Badge>
          <Badge variant="outline" className="rounded-md">
            {operation.objectType}
          </Badge>
        </div>
        {operation.sql.length > 0 && (
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {operation.sql.join("\n")}
          </pre>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {operation.tableName ? `${operation.tableName}.` : ""}
        {operation.objectName}
      </span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: SchemaDiffOperation["severity"] }) {
  if (severity === "safe") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (severity === "destructive") return <ShieldAlert className="size-4 text-red-500" />;
  return <TriangleAlert className="size-4 text-amber-500" />;
}
