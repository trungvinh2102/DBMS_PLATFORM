/**
 * @file RouterTermsCard.tsx
 * @description Settings card for editing QurioDB AI router keyword rows.
 */

import { useEffect, useMemo, useState } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aiApi } from "@/lib/api-client";

import { AddRouterTermDialog } from "./AddRouterTermDialog";
import { RouterTermDraft, RouterTermRow } from "./RouterTermRow";
import { AIRouterTerm, AIRouterTermSet } from "./types";

const TERM_SET_LABELS: Record<string, string> = {
  exploration_terms: "Exploration",
  metric_terms: "Metrics",
  sql_coding_terms: "SQL coding",
  schema_terms: "Schema",
  document_terms: "Documents",
};

const emptyDraft: RouterTermDraft = {
  term: "",
  language: "any",
  matchType: "phrase",
  weight: 1,
  isNegative: false,
  enabled: true,
  notes: "",
};

export function RouterTermsCard() {
  const queryClient = useQueryClient();
  const [selectedSetKey, setSelectedSetKey] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTerm, setNewTerm] = useState<RouterTermDraft>(emptyDraft);
  const [drafts, setDrafts] = useState<Record<string, RouterTermDraft>>({});

  const termSetsQuery = useQuery({
    queryKey: ["ai-router-terms"],
    queryFn: () => aiApi.getRouterTerms(),
  });

  const termSets = (termSetsQuery.data || []) as AIRouterTermSet[];
  const selectedSet = useMemo(() => {
    return termSets.find((termSet) => termSet.key === selectedSetKey) || termSets[0];
  }, [selectedSetKey, termSets]);

  useEffect(() => {
    if (!selectedSetKey && termSets[0]?.key) {
      setSelectedSetKey(termSets[0].key);
    }
  }, [selectedSetKey, termSets]);

  useEffect(() => {
    if (!selectedSet) return;
    setNewTerm((current) => ({
      ...current,
      weight: Number(selectedSet.defaultWeight || 1),
    }));
    setDrafts(Object.fromEntries(selectedSet.terms.map((term) => [term.id, toDraft(term)])));
  }, [selectedSet]);

  const invalidateTerms = () => {
    queryClient.invalidateQueries({ queryKey: ["ai-router-terms"] });
  };

  const createMutation = useMutation({
    mutationFn: () => aiApi.createRouterTerm({ ...newTerm, termSetKey: selectedSet?.key }),
    onSuccess: () => {
      toast.success("Router term added.");
      setNewTerm({ ...emptyDraft, weight: Number(selectedSet?.defaultWeight || 1) });
      setIsAddDialogOpen(false);
      invalidateTerms();
    },
    onError: (err: any) => toast.error(`Add failed: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RouterTermDraft> }) => aiApi.updateRouterTerm(id, data),
    onSuccess: () => {
      toast.success("Router term saved.");
      invalidateTerms();
    },
    onError: (err: any) => toast.error(`Save failed: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteRouterTerm(id),
    onSuccess: (result: any) => {
      toast.success(result?.disabled ? "System term disabled." : "Router term removed.");
      invalidateTerms();
    },
    onError: (err: any) => toast.error(`Remove failed: ${err.message}`),
  });

  const updateDraft = (termId: string, patch: Partial<RouterTermDraft>) => {
    setDrafts((current) => ({
      ...current,
      [termId]: { ...current[termId], ...patch },
    }));
  };

  const canCreate = Boolean(selectedSet?.key && newTerm.term.trim());
  const terms = selectedSet?.terms || [];

  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card relative">
      <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-cyan-500 to-blue-600 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 shadow-sm">
              <DatabaseZap className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl font-bold">Router Terms</CardTitle>
              <CardDescription>Manage individual keywords used before AI routing and RAG planning.</CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="rounded-md text-[9px] font-bold uppercase tracking-widest">
              {termSets.reduce((count, termSet) => count + termSet.terms.length, 0)} rows
            </Badge>
            {!termSetsQuery.isLoading && (
              <AddRouterTermDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
                draft={newTerm}
                setDraft={setNewTerm}
                selectedSetLabel={labelForSet(selectedSet?.key || "")}
                canCreate={canCreate}
                isCreating={createMutation.isPending}
                onCreate={() => createMutation.mutate()}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {termSetsQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:max-w-64">
              <Select value={selectedSet?.key || ""} onValueChange={(value) => value && setSelectedSetKey(value)}>
                <SelectTrigger className="h-10 rounded-lg border-border/50 bg-background/70 text-xs">
                  <span className="truncate text-left">{labelForSet(selectedSet?.key || "")}</span>
                </SelectTrigger>
                <SelectContent align="start" sideOffset={8} className="rounded-lg border-border/50">
                  {termSets.map((termSet) => (
                    <SelectItem key={termSet.id} value={termSet.key}>
                      {labelForSet(termSet.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[calc(100vh-31rem)] min-h-64 overflow-y-auto rounded-lg border border-border/50 bg-background/40 custom-scrollbar">
              {terms.length ? (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[32%] px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Term
                      </TableHead>
                      <TableHead className="w-[12%] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Language
                      </TableHead>
                      <TableHead className="w-[16%] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Match
                      </TableHead>
                      <TableHead className="w-[10%] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Weight
                      </TableHead>
                      <TableHead className="w-[8%] text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        On
                      </TableHead>
                      <TableHead className="w-[8%] text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Neg
                      </TableHead>
                      <TableHead className="w-[14%] text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terms.map((term) => {
                      const draft = drafts[term.id] || toDraft(term);
                      return (
                        <RouterTermRow
                          key={term.id}
                          term={term}
                          draft={draft}
                          onDraftChange={updateDraft}
                          onSave={(id, data) => updateMutation.mutate({ id, data })}
                          onToggle={(id, data) => updateMutation.mutate({ id, data })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 py-8 text-center text-xs text-muted-foreground">
                  No router terms in this set.
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function toDraft(term: AIRouterTerm): RouterTermDraft {
  return {
    term: term.term,
    language: term.language || "any",
    matchType: term.matchType || "phrase",
    weight: Number(term.weight || 1),
    isNegative: Boolean(term.isNegative),
    enabled: Boolean(term.enabled),
    notes: term.notes || "",
  };
}

function labelForSet(key: string) {
  return TERM_SET_LABELS[key] || key;
}
