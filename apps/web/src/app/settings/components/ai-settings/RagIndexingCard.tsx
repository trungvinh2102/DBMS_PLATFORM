/**
 * @file RagIndexingCard.tsx
 * @description RAG source indexing and status controls for AI settings.
 */

import { useMemo, useState } from "react";
import { Activity, Database, FileText, Loader2, PlayCircle, RefreshCw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

interface RagPipelineStage {
  key: string;
  name: string;
  status: string;
  capabilities?: string[];
}

interface RagPipelineStatus {
  enabled?: boolean;
  stageCount?: number;
  vectorStore?: {
    backend?: string;
    enabled?: boolean;
  };
  stages?: RagPipelineStage[];
}

interface RagSourceDetail extends RagSource {
  chunks?: Array<{
    metadata?: {
      citation?: string;
    };
  }>;
}

const getDatabaseLabel = (database: any) => database.databaseName || database.name || database.id;

export function RagIndexingCard() {
  const queryClient = useQueryClient();
  const [selectedDatabaseId, setSelectedDatabaseId] = useState("");
  const [includeQueryHistory, setIncludeQueryHistory] = useState(false);
  const [includeFailedHistory, setIncludeFailedHistory] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  const statusQuery = useQuery({
    queryKey: ["rag-status"],
    queryFn: () => aiApi.getRagStatus(),
  });

  const pipelineStatusQuery = useQuery({
    queryKey: ["rag-pipeline-status"],
    queryFn: () => aiApi.getRagPipelineStatus(),
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
  const selectedDatabase = selectedDatabaseId || databaseOptions[0]?.id || "";
  const sources = (sourcesQuery.data || []) as RagSource[];

  const invalidateRag = () => {
    queryClient.invalidateQueries({ queryKey: ["rag-sources"] });
    queryClient.invalidateQueries({ queryKey: ["rag-status"] });
    queryClient.invalidateQueries({ queryKey: ["rag-pipeline-status"] });
  };

  const syncPipelineMutation = useMutation({
    mutationFn: () => aiApi.syncRagDatabase(selectedDatabase, {
      schema_name: "public",
      includeSavedQueries: true,
      includeQueryHistory,
      includeFailedHistory,
      queryHistoryLimit: 100,
    }),
    onSuccess: () => {
      toast.success("RAG pipeline synced.");
      invalidateRag();
    },
    onError: (err: any) => toast.error(`Pipeline sync failed: ${err.message}`),
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

  const evaluatePipelineMutation = useMutation({
    mutationFn: async () => {
      const source = sources.find((item) => item.status === "indexed");
      if (!source) throw new Error("Index at least one source before running evaluation.");

      const detail = await aiApi.getRagSource(source.id) as RagSourceDetail;
      const expectedCitation = detail.chunks
        ?.map((chunk) => chunk.metadata?.citation)
        .find(Boolean);
      if (!expectedCitation) throw new Error("Selected source has no citation metadata.");

      return aiApi.evaluateRag({
        cases: [{
          name: `Smoke: ${source.title}`,
          query: source.title,
          expectedCitations: [expectedCitation],
          databaseId: source.databaseId || selectedDatabase || undefined,
          sourceTypes: [source.sourceType],
          topK: 8,
          maxLatencyMs: 1500,
        }],
      });
    },
    onSuccess: (result) => {
      setEvaluationResult(result);
      toast.success("RAG evaluation completed.");
    },
    onError: (err: any) => toast.error(`RAG evaluation failed: ${err.message}`),
  });

  const selectedDatabaseLabel = useMemo(() => {
    const database = databaseOptions.find((option: any) => option.id === selectedDatabase);
    return database ? getDatabaseLabel(database) : "";
  }, [databaseOptions, selectedDatabase]);
  const canIndexDocument = Boolean(documentTitle.trim() && documentContent.trim());
  const vectorStatus = statusQuery.data?.vectorStore;
  const pipelineStatus = pipelineStatusQuery.data as RagPipelineStatus | undefined;
  const stages = pipelineStatus?.stages || [];
  const evalSummary = evaluationResult?.summary;

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
            {pipelineStatus?.stageCount || 0} stages / {vectorStatus?.backend || "sqlite_json"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Select
            value={selectedDatabase}
            onValueChange={setSelectedDatabaseId}
            disabled={!databaseOptions.length}
          >
            <SelectTrigger
              className="h-10 w-full rounded-xl border-border/40 bg-muted/20 px-3 text-xs font-medium focus:ring-1 focus:ring-primary/20"
              aria-label="Database for RAG indexing"
            >
              <span
                className={cn(
                  "flex-1 truncate text-left",
                  !selectedDatabaseLabel && "text-muted-foreground",
                )}
              >
                {selectedDatabaseLabel || "Select database"}
              </span>
            </SelectTrigger>
            <SelectContent align="start" side="top" sideOffset={8} className="rounded-xl p-1">
              {databaseOptions.map((database: any) => (
                <SelectItem key={database.id} value={database.id} className="rounded-lg">
                  {getDatabaseLabel(database)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="gap-2"
            disabled={!selectedDatabase || syncPipelineMutation.isPending}
            onClick={() => syncPipelineMutation.mutate()}
          >
            {syncPipelineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync pipeline
          </Button>
        </div>

        <div className="grid gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 md:grid-cols-[1fr_auto_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(
              "rounded-md text-[9px] font-bold uppercase tracking-widest",
              pipelineStatus?.enabled ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" : "border-amber-500/20 bg-amber-500/5 text-amber-600",
            )}>
              {pipelineStatus?.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <span className="truncate text-xs font-semibold">
              {stages.length ? `${stages.length} production stages mapped` : "Pipeline status unavailable"}
            </span>
          </div>
          <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground md:justify-end">
            History
            <Switch
              checked={includeQueryHistory}
              onCheckedChange={(checked: boolean) => setIncludeQueryHistory(checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground md:justify-end">
            Failed
            <Switch
              checked={includeFailedHistory}
              disabled={!includeQueryHistory}
              onCheckedChange={(checked: boolean) => setIncludeFailedHistory(checked)}
            />
          </label>
        </div>

        {stages.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((stage, index) => (
              <div key={stage.key} className="flex min-w-0 items-center gap-2 rounded-md border border-border/50 bg-background/70 px-2.5 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black tabular-nums text-emerald-600">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold">{stage.name}</div>
                  <div className="truncate text-[9px] uppercase tracking-widest text-muted-foreground">
                    {stage.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">Retrieval evaluation</div>
              <div className="truncate text-[10px] text-muted-foreground">
                {evalSummary ? `${evalSummary.passedCases}/${evalSummary.totalCases} passed, recall ${Math.round((evalSummary.recallAtK || 0) * 100)}%` : "No evaluation run yet"}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
            disabled={!sources.length || evaluatePipelineMutation.isPending}
            onClick={() => evaluatePipelineMutation.mutate()}
          >
            {evaluatePipelineMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Run eval
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
