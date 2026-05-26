/**
 * @file page.tsx
 * @description Schema Diff page for comparing two database schemas and generating migration SQL.
 */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GitCompare } from "lucide-react";
import { toast } from "sonner";

import { databaseApi } from "@/lib/api-client";

import { SchemaDiffControls } from "./components/SchemaDiffControls";
import { SchemaDiffResults } from "./components/SchemaDiffResults";
import type { DatabaseConnection, SchemaDiffResult } from "./types";

export default function SchemaDiffPage() {
  const [sourceDatabaseId, setSourceDatabaseId] = useState("");
  const [targetDatabaseId, setTargetDatabaseId] = useState("");
  const [sourceSchema, setSourceSchema] = useState("");
  const [targetSchema, setTargetSchema] = useState("");
  const [includeDestructive, setIncludeDestructive] = useState(false);
  const [result, setResult] = useState<SchemaDiffResult | null>(null);

  const databasesQuery = useQuery<DatabaseConnection[]>({
    queryKey: ["schema-diff", "databases"],
    queryFn: () => databaseApi.list(),
  });

  const sqlDatabases = useMemo(
    () => (databasesQuery.data || []).filter((database) => !["mongodb", "redis"].includes((database.type || "").toLowerCase())),
    [databasesQuery.data],
  );

  const sourceSchemasQuery = useQuery<string[]>({
    queryKey: ["schema-diff", "schemas", sourceDatabaseId],
    queryFn: () => databaseApi.getSchemas(sourceDatabaseId),
    enabled: Boolean(sourceDatabaseId),
  });

  const targetSchemasQuery = useQuery<string[]>({
    queryKey: ["schema-diff", "schemas", targetDatabaseId],
    queryFn: () => databaseApi.getSchemas(targetDatabaseId),
    enabled: Boolean(targetDatabaseId),
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      databaseApi.compareSchema({
        sourceDatabaseId,
        targetDatabaseId,
        sourceSchema: sourceSchema || undefined,
        targetSchema: targetSchema || undefined,
        includeDestructive,
      }) as Promise<SchemaDiffResult>,
    onSuccess: (data) => {
      setResult(data);
      toast.success(data.summary.total === 0 ? "Schemas match" : `Found ${data.summary.total} schema changes`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Schema comparison failed"),
  });

  const canCompare = Boolean(sourceDatabaseId && targetDatabaseId && sourceDatabaseId !== targetDatabaseId);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto grid max-w-7xl gap-4 p-4 md:p-6">
        <header className="flex flex-col gap-2 border-b pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitCompare className="size-4" />
              Schema compare
            </div>
            <h1 className="mt-1 text-2xl font-semibold">Schema Diff</h1>
          </div>
        </header>

        <SchemaDiffControls
          databases={sqlDatabases}
          sourceDatabaseId={sourceDatabaseId}
          targetDatabaseId={targetDatabaseId}
          sourceSchema={sourceSchema}
          targetSchema={targetSchema}
          sourceSchemas={sourceSchemasQuery.data || []}
          targetSchemas={targetSchemasQuery.data || []}
          includeDestructive={includeDestructive}
          isLoading={compareMutation.isPending}
          isDisabled={!canCompare}
          onSourceDatabaseChange={(value) => {
            setSourceDatabaseId(value);
            setSourceSchema("");
            setResult(null);
          }}
          onTargetDatabaseChange={(value) => {
            setTargetDatabaseId(value);
            setTargetSchema("");
            setResult(null);
          }}
          onSourceSchemaChange={setSourceSchema}
          onTargetSchemaChange={setTargetSchema}
          onIncludeDestructiveChange={setIncludeDestructive}
          onCompare={() => compareMutation.mutate()}
        />

        {!canCompare && (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
            Source and target must be different SQL connections.
          </div>
        )}

        <SchemaDiffResults result={result} />
      </div>
    </div>
  );
}
