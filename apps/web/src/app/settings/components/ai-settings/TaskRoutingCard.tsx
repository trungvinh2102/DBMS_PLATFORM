/**
 * @file TaskRoutingCard.tsx
 * @description Settings card for assigning QurioDB AI tasks to specific registered models.
 */

import { useEffect, useMemo, useState } from "react";
import { Route, Save, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { AIModel, AITaskAssignment, AITaskCatalogItem } from "./types";

const AUTO_MODEL_VALUE = "__auto__";

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
      <CardContent className="space-y-3 pt-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          catalog.map((task) => {
            const assignment = draft[task.key];
            const selectedModel = modelsById.get(assignment?.modelId || "");
            const isProviderReady = providerHasKey(selectedModel);
            const hasCapabilities = modelSupportsTask(task, selectedModel);

            return (
              <div
                key={task.key}
                className="grid gap-3 rounded-lg border border-border/50 bg-muted/10 p-4 lg:grid-cols-[minmax(0,1fr)_18rem_18rem_5rem]"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black tracking-tight">{task.name}</div>
                    <Badge variant="outline" className="rounded-md text-[9px] font-bold uppercase tracking-widest">
                      {task.key}
                    </Badge>
                    {!isProviderReady && (
                      <Badge variant="outline" className="rounded-md border-amber-500/20 bg-amber-500/5 text-[9px] text-amber-600">
                        Missing key
                      </Badge>
                    )}
                    {!hasCapabilities && (
                      <Badge variant="outline" className="rounded-md border-rose-500/20 bg-rose-500/5 text-[9px] text-rose-600">
                        Capability warning
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{task.description}</p>
                </div>

                <ModelSelect
                  label="Primary"
                  value={assignment?.modelId || AUTO_MODEL_VALUE}
                  models={models}
                  onChange={(modelId) => updateTask(task.key, { modelId })}
                />

                <ModelSelect
                  label="Fallback"
                  value={assignment?.fallbackModelId || AUTO_MODEL_VALUE}
                  models={models}
                  onChange={(fallbackModelId) => updateTask(task.key, { fallbackModelId })}
                />

                <div className="flex items-center justify-between gap-2 lg:justify-end">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground/50" />
                  <Switch
                    checked={assignment?.enabled ?? true}
                    onCheckedChange={(enabled: boolean) => updateTask(task.key, { enabled })}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

interface ModelSelectProps {
  label: string;
  value: string;
  models: AIModel[];
  onChange: (modelId: string | null) => void;
}

function ModelSelect({ label, value, models, onChange }: ModelSelectProps) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={(next) => onChange(next === AUTO_MODEL_VALUE ? null : next)}>
        <SelectTrigger className="h-10 rounded-lg border-border/50 bg-background/70 text-xs">
          <SelectValue placeholder="Auto" />
        </SelectTrigger>
        <SelectContent side="bottom" alignItemWithTrigger={false} className="rounded-lg border-border/50">
          <SelectItem value={AUTO_MODEL_VALUE}>Auto</SelectItem>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.modelId}>
              {model.name} / {model.provider}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
