/**
 * @file TaskRoutingCard.tsx
 * @description Settings card for assigning QurioDB AI tasks to specific registered models.
 */

import { useEffect, useMemo, useState } from "react";
import { Route, Save, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { AIModel, AITaskAssignment, AITaskCatalogItem } from "./types";

const AUTO_MODEL_VALUE = "__auto__";
const getModelLabel = (model: AIModel) => `${model.name} / ${model.provider}`;

interface TaskRoutingCardProps {
  catalog: AITaskCatalogItem[];
  assignments: AITaskAssignment[];
  models: AIModel[];
  runtimeStatus?: any;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (assignments: AITaskAssignment[]) => void;
}

export function TaskRoutingCard({
  catalog,
  assignments,
  models,
  runtimeStatus,
  isLoading,
  isSaving,
  onSave,
}: TaskRoutingCardProps) {
  const [draft, setDraft] = useState<Record<string, AITaskAssignment>>({});

  const modelsById = useMemo(() => {
    return new Map(models.map((model) => [model.modelId, model]));
  }, [models]);

  useEffect(() => {
    const nextDraft: Record<string, AITaskAssignment> = {};
    catalog.forEach((task) => {
      const assignment = assignments.find((item) => item.taskKey === task.key);
      nextDraft[task.key] = assignment || {
        taskKey: task.key,
        modelId: null,
        fallbackModelId: null,
        enabled: true,
      };
    });
    setDraft(nextDraft);
  }, [assignments, catalog]);

  const updateTask = (taskKey: string, patch: Partial<AITaskAssignment>) => {
    setDraft((current) => ({
      ...current,
      [taskKey]: {
        ...current[taskKey],
        taskKey,
        ...patch,
      },
    }));
  };

  const providerHasKey = (model?: AIModel) => {
    if (!model?.provider || !runtimeStatus?.providers) return true;
    return runtimeStatus.providers[model.provider.toLowerCase()]?.hasApiKey ?? true;
  };

  const modelSupportsTask = (task: AITaskCatalogItem, model?: AIModel) => {
    if (!model || task.requiredCapabilities.length === 0) return true;
    return task.requiredCapabilities.every((capability) => Boolean(model.capabilities?.[capability]));
  };

  const saveDraft = () => {
    onSave(Object.values(draft));
  };

  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card relative">
      <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-violet-500 to-sky-500 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 shadow-sm">
              <Route className="h-5 w-5 text-violet-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl font-bold">AI Task Routing</CardTitle>
              <CardDescription>
                Assign each AI capability to the model that fits it best.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-lg font-bold"
            onClick={saveDraft}
            disabled={isLoading || isSaving}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            Save routing
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="max-h-[calc(100vh-25rem)] min-h-72 overflow-y-auto rounded-lg border border-border/50 bg-background/40 custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[32%] px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Task
                  </TableHead>
                  <TableHead className="w-[24%] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Primary
                  </TableHead>
                  <TableHead className="w-[24%] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Fallback
                  </TableHead>
                  <TableHead className="w-[12%] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="w-[8%] text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Enabled
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.map((task) => {
                  const assignment = draft[task.key];
                  const selectedModel = modelsById.get(assignment?.modelId || "");
                  const isProviderReady = providerHasKey(selectedModel);
                  const hasCapabilities = modelSupportsTask(task, selectedModel);

                  return (
                    <TableRow
                      key={task.key}
                      className={cn(
                        "border-border/40 hover:bg-muted/20",
                        !(assignment?.enabled ?? true) && "opacity-60",
                      )}
                    >
                      <TableCell className="px-4 py-3 align-top whitespace-normal">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black tracking-tight">{task.name}</span>
                            <Badge variant="outline" className="rounded-md text-[9px] font-bold uppercase tracking-widest">
                              {task.key}
                            </Badge>
                          </div>
                          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{task.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <ModelSelect
                          value={assignment?.modelId || AUTO_MODEL_VALUE}
                          models={models}
                          onChange={(modelId) => updateTask(task.key, { modelId })}
                        />
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <ModelSelect
                          value={assignment?.fallbackModelId || AUTO_MODEL_VALUE}
                          models={models}
                          onChange={(fallbackModelId) => updateTask(task.key, { fallbackModelId })}
                        />
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          {!isProviderReady && (
                            <Badge variant="outline" className="w-fit rounded-md border-amber-500/20 bg-amber-500/5 text-[9px] text-amber-600">
                              Missing key
                            </Badge>
                          )}
                          {!hasCapabilities && (
                            <Badge variant="outline" className="w-fit rounded-md border-rose-500/20 bg-rose-500/5 text-[9px] text-rose-600">
                              Capability
                            </Badge>
                          )}
                          {isProviderReady && hasCapabilities && (
                            <Badge variant="outline" className="w-fit rounded-md border-emerald-500/20 bg-emerald-500/5 text-[9px] text-emerald-600">
                              Ready
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 pr-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <SlidersHorizontal className="h-4 w-4 text-muted-foreground/50" />
                          <Switch
                            checked={assignment?.enabled ?? true}
                            onCheckedChange={(enabled: boolean) => updateTask(task.key, { enabled })}
                            aria-label={`Enable ${task.name}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ModelSelectProps {
  value: string;
  models: AIModel[];
  onChange: (modelId: string | null) => void;
}

function ModelSelect({ value, models, onChange }: ModelSelectProps) {
  const selectedModel = models.find((model) => model.modelId === value);
  const selectedLabel = selectedModel ? getModelLabel(selectedModel) : "Auto";

  return (
    <Select value={value} onValueChange={(next) => onChange(next === AUTO_MODEL_VALUE ? null : next)}>
      <SelectTrigger className="min-h-9 h-auto w-full whitespace-normal rounded-md border-border/50 bg-background/80 py-2 text-xs">
        <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-4">
          {selectedLabel}
        </span>
      </SelectTrigger>
      <SelectContent
        side="bottom"
        alignItemWithTrigger={false}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-lg border-border/50"
      >
        <SelectItem value={AUTO_MODEL_VALUE}>Auto</SelectItem>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.modelId}>
            <span className="whitespace-normal break-words leading-4">
              {getModelLabel(model)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
