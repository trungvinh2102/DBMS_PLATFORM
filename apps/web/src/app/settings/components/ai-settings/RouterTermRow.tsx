/**
 * @file RouterTermRow.tsx
 * @description Editable row for one AI router keyword term.
 */

import { Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { AIRouterTerm } from "./types";

const MATCH_TYPES = ["phrase", "token", "prefix", "regex"];

export type RouterTermDraft = Pick<AIRouterTerm, "term" | "language" | "matchType" | "weight" | "isNegative" | "enabled" | "notes">;

interface RouterTermRowProps {
  term: AIRouterTerm;
  draft: RouterTermDraft;
  onDraftChange: (termId: string, patch: Partial<RouterTermDraft>) => void;
  onSave: (termId: string, draft: RouterTermDraft) => void;
  onToggle: (termId: string, patch: Partial<RouterTermDraft>) => void;
  onDelete: (termId: string) => void;
}

export function RouterTermRow({ term, draft, onDraftChange, onSave, onToggle, onDelete }: RouterTermRowProps) {
  return (
    <TableRow
      className={cn(
        "border-border/40 hover:bg-muted/20",
        !draft.enabled && "opacity-60",
      )}
    >
      <TableCell className="min-w-56 py-2 pl-4">
        <Input
          value={draft.term}
          onChange={(event) => onDraftChange(term.id, { term: event.target.value })}
          className="h-9 rounded-md bg-background/80 text-xs"
          aria-label={`Router term ${term.term}`}
        />
      </TableCell>
      <TableCell className="min-w-28 py-2">
        <Input
          value={draft.language}
          onChange={(event) => onDraftChange(term.id, { language: event.target.value })}
          className="h-9 rounded-md bg-background/80 text-xs"
          aria-label={`Language for ${term.term}`}
        />
      </TableCell>
      <TableCell className="min-w-32 py-2">
        <MatchTypeSelect
          value={draft.matchType}
          onChange={(matchType) => onDraftChange(term.id, { matchType })}
        />
      </TableCell>
      <TableCell className="min-w-24 py-2">
        <Input
          type="number"
          min="0"
          step="0.1"
          value={draft.weight}
          onChange={(event) => onDraftChange(term.id, { weight: Number(event.target.value) })}
          className="h-9 rounded-md bg-background/80 text-xs"
          aria-label={`Weight for ${term.term}`}
        />
      </TableCell>
      <TableCell className="py-2 text-center">
        <Switch
          checked={draft.enabled}
          onCheckedChange={(enabled: boolean) => onToggle(term.id, { enabled })}
          aria-label={`Enable ${term.term}`}
        />
      </TableCell>
      <TableCell className="py-2 text-center">
        <Switch
          checked={draft.isNegative}
          onCheckedChange={(isNegative: boolean) => onToggle(term.id, { isNegative })}
          aria-label={`Mark ${term.term} as negative`}
        />
      </TableCell>
      <TableCell className="py-2 pr-4">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => onSave(term.id, draft)}
            aria-label={`Save ${term.term}`}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(term.id)}
            aria-label={`Remove ${term.term}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function MatchTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value || "phrase"} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="h-9 rounded-md border-border/50 bg-background/80 text-xs">
        <span className="truncate text-left">{value || "phrase"}</span>
      </SelectTrigger>
      <SelectContent align="start" sideOffset={8} className="rounded-lg border-border/50">
        {MATCH_TYPES.map((matchType) => (
          <SelectItem key={matchType} value={matchType}>
            {matchType}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
