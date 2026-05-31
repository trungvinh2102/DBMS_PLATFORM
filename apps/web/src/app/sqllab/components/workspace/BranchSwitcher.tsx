/**
 * @file BranchSwitcher.tsx
 * @description Shared Git branch checkout and creation controls for SQL Lab source control panels.
 */

import { useState } from "react";
import { GitBranch as GitBranchIcon, GitPullRequestCreate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GitBranch, GitStatus } from "./workspace-panel-types";

type BranchSwitcherProps = {
  gitStatus?: GitStatus;
  branches: GitBranch[];
  isCheckingOut: boolean;
  onCheckoutBranch: (branch: string) => void;
  onCreateBranch: (branch: string, startPoint?: string) => void;
};

export function BranchSwitcher({
  gitStatus,
  branches,
  isCheckingOut,
  onCheckoutBranch,
  onCreateBranch,
}: BranchSwitcherProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const currentBranch = gitStatus?.branch || "";
  const hasRepository = Boolean(gitStatus?.isRepository);

  return (
    <div className="grid gap-2 border-b px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
          <GitBranchIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="min-w-0 truncate font-mono">{currentBranch || "No branch"}</span>
        </div>
        <Badge variant="outline" className="h-5 shrink-0 px-1.5 font-mono text-[10px]">
          {gitStatus?.upstream || "local"}
        </Badge>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_2rem] gap-2">
        <Select value={currentBranch} onValueChange={(value) => value && value !== currentBranch && onCheckoutBranch(value)} disabled={!hasRepository || isCheckingOut}>
          <SelectTrigger className="h-8 w-full rounded-md text-xs" aria-label="Checkout branch">
            <SelectValue placeholder="Checkout branch" />
          </SelectTrigger>
          <SelectContent align="start" className="max-h-72">
            {branches.length ? (
              branches.map((branch) => (
                <SelectItem key={`${branch.isRemote ? "remote" : "local"}-${branch.name}`} value={branch.name}>
                  <span className="min-w-0 truncate font-mono">{branch.name}</span>
                  {branch.isRemote ? <span className="text-[10px] text-muted-foreground">remote</span> : null}
                </SelectItem>
              ))
            ) : (
              <SelectItem value={currentBranch || "no-branches"} disabled>
                No branches
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-md"
          disabled={!hasRepository || isCheckingOut}
          onClick={() => setIsDialogOpen(true)}
          aria-label="Create branch"
          title="Create branch"
        >
          <GitPullRequestCreate className="h-3.5 w-3.5" />
        </Button>
      </div>
      <CreateBranchDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        currentBranch={currentBranch}
        branches={branches}
        isCheckingOut={isCheckingOut}
        onCreateBranch={onCreateBranch}
      />
    </div>
  );
}

function CreateBranchDialog({
  open,
  onOpenChange,
  currentBranch,
  branches,
  isCheckingOut,
  onCreateBranch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranch: string;
  branches: GitBranch[];
  isCheckingOut: boolean;
  onCreateBranch: (branch: string, startPoint?: string) => void;
}) {
  const [branchName, setBranchName] = useState("");
  const [startPoint, setStartPoint] = useState(currentBranch);
  const trimmedBranchName = branchName.trim();

  const handleCreate = () => {
    if (!trimmedBranchName) return;
    onCreateBranch(trimmedBranchName, startPoint || undefined);
    setBranchName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Branch</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="branchName">Branch name</Label>
            <Input
              id="branchName"
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
              placeholder="feature/customer-retention"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startPoint">Start from</Label>
            <Select value={startPoint} onValueChange={(value) => setStartPoint(value || currentBranch)}>
              <SelectTrigger id="startPoint" className="h-10 w-full rounded-md font-mono text-xs">
                <SelectValue placeholder={currentBranch || "HEAD"} />
              </SelectTrigger>
              <SelectContent align="start" className="max-h-72">
                {branches.map((branch) => (
                  <SelectItem key={`${branch.isRemote ? "remote" : "local"}-${branch.name}`} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCheckingOut || !trimmedBranchName}>
            <GitPullRequestCreate className="mr-2 h-4 w-4" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
