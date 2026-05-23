/**
 * @file AddRouterTermDialog.tsx
 * @description Dialog for creating a new AI router keyword term.
 */

import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { MatchTypeSelect, type RouterTermDraft } from "./RouterTermRow";

interface AddRouterTermDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  draft: RouterTermDraft;
  setDraft: (draft: RouterTermDraft) => void;
  selectedSetLabel: string;
  canCreate: boolean;
  isCreating: boolean;
  onCreate: () => void;
}

export function AddRouterTermDialog({
  isOpen,
  setIsOpen,
  draft,
  setDraft,
  selectedSetLabel,
  canCreate,
  isCreating,
  onCreate,
}: AddRouterTermDialogProps) {
  const updateDraft = (patch: Partial<RouterTermDraft>) => {
    setDraft({ ...draft, ...patch });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" className="h-9 gap-2 rounded-lg font-bold">
            <Plus className="h-3.5 w-3.5" />
            Add Term
          </Button>
        }
      />
      <DialogContent className="overflow-hidden rounded-2xl border-border/50 p-0 shadow-2xl sm:max-w-[620px]">
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Router Term</DialogTitle>
            <DialogDescription>
              Create a keyword for the {selectedSetLabel} routing set.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Term
              </label>
              <Input
                autoFocus
                value={draft.term}
                onChange={(event) => updateDraft({ term: event.target.value })}
                placeholder="Keyword or phrase"
                className="h-11 rounded-xl bg-muted/20 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_7rem]">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Language
                </label>
                <Input
                  value={draft.language}
                  onChange={(event) => updateDraft({ language: event.target.value })}
                  className="h-10 rounded-xl bg-muted/20 text-sm"
                  aria-label="New router term language"
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Match
                </label>
                <MatchTypeSelect
                  value={draft.matchType}
                  onChange={(matchType) => updateDraft({ matchType })}
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Weight
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={draft.weight}
                  onChange={(event) => updateDraft({ weight: Number(event.target.value) })}
                  className="h-10 rounded-xl bg-muted/20 text-sm"
                  aria-label="New router term weight"
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-4 text-sm font-medium">
                Enabled
                <Switch
                  checked={draft.enabled}
                  onCheckedChange={(enabled: boolean) => updateDraft({ enabled })}
                  aria-label="Enable new router term"
                />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm font-medium">
                Negative
                <Switch
                  checked={draft.isNegative}
                  onCheckedChange={(isNegative: boolean) => updateDraft({ isNegative })}
                  aria-label="Mark new router term as negative"
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 bg-muted/30 p-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl font-semibold"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2 rounded-xl font-bold"
            disabled={!canCreate || isCreating}
            onClick={onCreate}
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Term
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
