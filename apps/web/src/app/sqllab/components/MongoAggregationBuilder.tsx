/**
 * @file MongoAggregationBuilder.tsx
 * @description Inline MongoDB aggregation pipeline builder for SQL Lab.
 */

import { useMemo, useState } from "react";
import { Braces, Copy, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  buildMongoAggregationQuery,
  type MongoStage,
} from "../utils/nosql-builders";

const STAGE_OPTIONS = [
  "$match",
  "$project",
  "$group",
  "$sort",
  "$limit",
  "$lookup",
  "$unwind",
  "$addFields",
  "$count",
];

const STAGE_DEFAULTS: Record<string, string> = {
  $match: '{ "status": "active" }',
  $project: '{ "_id": 0, "name": 1 }',
  $group: '{ "_id": "$field", "count": { "$sum": 1 } }',
  $sort: '{ "createdAt": -1 }',
  $limit: "100",
  $lookup: '{ "from": "other_collection", "localField": "id", "foreignField": "refId", "as": "items" }',
  $unwind: '"$items"',
  $addFields: '{ "computed": true }',
  $count: '"total"',
};

type MongoAggregationBuilderProps = {
  collectionName: string | null;
  databaseName?: string;
  fields?: Array<{ name?: string }>;
  onApply: (query: string) => void;
  onRun: (query: string) => void;
};

export function MongoAggregationBuilder({
  collectionName,
  databaseName,
  fields = [],
  onApply,
  onRun,
}: MongoAggregationBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stages, setStages] = useState<MongoStage[]>([
    { id: crypto.randomUUID(), operator: "$match", body: '{ "status": "active" }' },
  ]);

  const preview = useMemo(() => {
    if (!collectionName) return "";
    try {
      return buildMongoAggregationQuery(databaseName, collectionName, stages);
    } catch {
      return "";
    }
  }, [collectionName, databaseName, stages]);

  const fieldNames = fields
    .map((field) => field.name)
    .filter((field): field is string => Boolean(field))
    .slice(0, 8);

  const updateStage = (id: string, patch: Partial<MongoStage>) => {
    setStages((current) =>
      current.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
    );
  };

  const addStage = () => {
    setStages((current) => [
      ...current,
      { id: crypto.randomUUID(), operator: "$project", body: STAGE_DEFAULTS.$project },
    ]);
  };

  const buildQuery = () => {
    if (!collectionName) {
      toast.error("Select a MongoDB collection first");
      return null;
    }

    try {
      return buildMongoAggregationQuery(databaseName, collectionName, stages);
    } catch (error: any) {
      toast.error(error?.message || "Invalid aggregation JSON");
      return null;
    }
  };

  const applyQuery = () => {
    const query = buildQuery();
    if (query) onApply(query);
  };

  const runQuery = () => {
    const query = buildQuery();
    if (query) onRun(query);
  };

  return (
    <div className="border-b bg-muted/10">
      <div className="flex min-h-11 items-center gap-2 px-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen((current) => !current)}
          className={cn(
            "h-8 gap-2 rounded-md px-2 text-[10px] font-black uppercase tracking-widest",
            isOpen && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          <Braces className="h-3.5 w-3.5" />
          Aggregation
        </Button>
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          {collectionName ? `${databaseName || "db"}.${collectionName}` : "no collection"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={applyQuery}
            aria-label="Apply aggregation query"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={runQuery}
            aria-label="Run aggregation query"
          >
            <Play className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-3 border-t px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div key={stage.id} className="grid gap-2 rounded-md border bg-background/60 p-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-black">
                    {index + 1}
                  </span>
                  <select
                    value={stage.operator}
                    onChange={(event) =>
                      updateStage(stage.id, {
                        operator: event.target.value,
                        body: STAGE_DEFAULTS[event.target.value],
                      })
                    }
                    className="h-8 rounded-md border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {STAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setStages((current) => current.filter((item) => item.id !== stage.id))}
                    disabled={stages.length === 1}
                    aria-label="Remove aggregation stage"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Textarea
                  value={stage.body}
                  onChange={(event) => updateStage(stage.id, { body: event.target.value })}
                  className="min-h-20 rounded-md font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addStage} className="h-8 rounded-md text-xs">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Stage
            </Button>
          </div>

          <div className="space-y-2">
            <pre className="max-h-72 overflow-auto rounded-md border bg-background p-3 text-[11px] leading-5">
              {preview || "Invalid JSON"}
            </pre>
            {fieldNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {fieldNames.map((field) => (
                  <button
                    key={field}
                    type="button"
                    className="rounded-md border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:bg-muted"
                    onClick={() => navigator.clipboard?.writeText(field)}
                  >
                    {field}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
