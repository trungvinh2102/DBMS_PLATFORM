/**
 * @file RagIndexingCard.tsx
 * @description RAG source indexing and status controls for AI settings.
 */

import { useMemo, useState } from "react";
import { Database, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aiApi, databaseApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface RagSource {
  id: string;
  sourceType: string;
  databaseId?: string;
  title: string;
  status: string;
  indexed_on?: string | null;
}

export function RagIndexingCard() {
  const queryClient = useQueryClient();
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");

  const statusQuery = useQuery({
    queryKey: ["rag-status"],
    queryFn: () => aiApi.getRagStatus(),
  });

  const sourcesQuery = useQuery({
    queryKey: ["rag-sources"],
    queryFn: () => aiApi.getRagSources(),
  });

  const databasesQuery = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const databaseOptions = useMemo(() => databasesQuery.data || [], [databasesQuery.data]);

  const invalidateRag = () => {
    queryClient.invalidateQueries({ queryKey: ["rag-sources"] });
    queryClient.invalidateQueries({ queryKey: ["rag-status"] });
  };

  const indexDatabaseMutation = useMutation({
    mutationFn: () => aiApi.indexRagDatabase(selectedDatabaseId || databaseOptions[0]?.id, "public"),
    onSuccess: () => {
      toast.success("Schema index refreshed.");
      invalidateRag();
    },
    onError: (err: any) => toast.error(`Schema indexing failed: ${err.message}`),
  });

  const indexSavedQueriesMutation = useMutation({
    mutationFn: () => aiApi.indexRagSavedQueries(selectedDatabaseId || databaseOptions[0]?.id),
    onSuccess: () => {
      toast.success("Saved queries indexed.");
      invalidateRag();
    },
    onError: (err: any) => toast.error(`Saved query indexing failed: ${err.message}`),
  });

  const indexDocumentMutation = useMutation({
    mutationFn: () => aiApi.indexRagSource({
      title: documentTitle,
      content: documentContent,
      sourceType: "document",
      databaseId: selectedDatabaseId || databaseOptions[0]?.id,
    }),
    onSuccess: () => {
      toast.success("Document source indexed.");
      setDocumentTitle("");
      setDocumentContent("");
      invalidateRag();
    },
    onError: (err: any) => toast.error(`Document indexing failed: ${err.message}`),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => aiApi.deleteRagSource(sourceId),
    onSuccess: () => {
      toast.success("RAG source removed.");
      invalidateRag();
    },
    onError: (err: any) => toast.error(`Source removal failed: ${err.message}`),
  });

  const selectedDatabase = selectedDatabaseId || databaseOptions[0]?.id || "";
  const canIndexDocument = Boolean(documentTitle.trim() && documentContent.trim());
  const sources = (sourcesQuery.data || []) as RagSource[];
  const vectorStatus = statusQuery.data?.vectorStore;

  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card relative">
      <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-teal-600 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
              <Database className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">RAG Index</CardTitle>
              <CardDescription>Manage local retrieval sources for grounded assistant answers.</CardDescription>
            </div>
          </div>
          <div className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {vectorStatus?.backend || "sqlite_json"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <select
            value={selectedDatabase}
            onChange={(event) => setSelectedDatabaseId(event.target.value)}
            className="h-10 rounded-xl border border-border/40 bg-muted/20 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
            aria-label="Database for RAG indexing"
          >
            {databaseOptions.map((database: any) => (
              <option key={database.id} value={database.id}>
                {database.databaseName || database.name || database.id}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedDatabase || indexDatabaseMutation.isPending}
            onClick={() => indexDatabaseMutation.mutate()}
          >
            {indexDatabaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Schema
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedDatabase || indexSavedQueriesMutation.isPending}
            onClick={() => indexSavedQueriesMutation.mutate()}
          >
            {indexSavedQueriesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Saved SQL
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto]">
          <Input
            value={documentTitle}
            onChange={(event) => setDocumentTitle(event.target.value)}
            placeholder="Document title"
            className="h-10 rounded-xl bg-muted/20"
          />
          <Textarea
            value={documentContent}
            onChange={(event) => setDocumentContent(event.target.value)}
            placeholder="Markdown or text content"
            className="min-h-10 rounded-xl bg-muted/20 text-xs"
          />
          <Button
            className="gap-2"
            disabled={!canIndexDocument || indexDocumentMutation.isPending}
            onClick={() => indexDocumentMutation.mutate()}
          >
            {indexDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {sourcesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sources.length ? (
            sources.slice(0, 8).map((source) => (
              <div key={source.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/15 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold">{source.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{source.sourceType}</span>
                    <span className={cn("h-1.5 w-1.5 rounded-full", source.status === "indexed" ? "bg-emerald-500" : "bg-amber-500")} />
                    <span>{source.status}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteSourceMutation.mutate(source.id)}
                  aria-label={`Delete ${source.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 py-8 text-center text-xs text-muted-foreground">
              No RAG sources indexed yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
