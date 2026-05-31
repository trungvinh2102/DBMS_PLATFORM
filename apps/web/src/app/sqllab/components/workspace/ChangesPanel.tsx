/**
 * @file ChangesPanel.tsx
 * @description Source control changes panel for SQL Lab workspace Git actions.
 */

import { Check, Download, GitCommitHorizontal, GitPullRequest, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BranchSwitcher } from "./BranchSwitcher";
import { ChangeMetric, EmptyState, PanelHeader } from "./WorkspacePanelShared";
import { STATUS_LABELS, STATUS_STYLES } from "./workspace-git-utils";
import type { ChangeSummary, GitBranch, GitChange, GitStatus } from "./workspace-panel-types";

type ChangesPanelProps = {
  changes: GitChange[];
  gitStatus?: GitStatus;
  branches: GitBranch[];
  selectedPath?: string | null;
  selectedFiles: string[];
  commitMessage: string;
  summary: ChangeSummary;
  isStaging: boolean;
  isUnstaging: boolean;
  isCommitting: boolean;
  isCheckingOutBranch: boolean;
  isPulling: boolean;
  isPushing: boolean;
  selectedOrCurrentPath: string[];
  onSelect: (path: string | null) => void;
  onOpen: (path: string) => void;
  onToggle: (path: string) => void;
  onCommitMessageChange: (value: string) => void;
  onStage: () => void;
  onUnstage: () => void;
  onCommit: () => void;
  onCheckoutBranch: (branch: string) => void;
  onCreateBranch: (branch: string, startPoint?: string) => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
};

export function ChangesPanel(props: ChangesPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader icon={<GitPullRequest className="h-4 w-4" />} title="Source Control" action={props.onRefresh} />
      <BranchSwitcher
        gitStatus={props.gitStatus}
        branches={props.branches}
        isCheckingOut={props.isCheckingOutBranch}
        onCheckoutBranch={props.onCheckoutBranch}
        onCreateBranch={props.onCreateBranch}
      />
      <ChangeSummaryBar summary={props.summary} />
      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        <div className="grid gap-2">
          {props.changes.length === 0 ? (
            <EmptyState title="Working tree clean" text="No tracked or untracked changes in this worktree." />
          ) : (
            props.changes.map((change) => (
              <ChangeRow
                key={change.path}
                change={change}
                isSelected={props.selectedPath === change.path}
                isChecked={props.selectedFiles.includes(change.path)}
                onSelect={props.onSelect}
                onOpen={props.onOpen}
                onToggle={props.onToggle}
              />
            ))
          )}
        </div>
      </ScrollArea>
      <ChangesActionBar {...props} />
    </div>
  );
}

function ChangeSummaryBar({ summary }: { summary: ChangeSummary }) {
  return (
    <div className="flex flex-wrap gap-2 border-b px-3 py-2">
      <ChangeMetric label="A" value={summary.added} className="text-sky-700 dark:text-sky-300" />
      <ChangeMetric label="M" value={summary.modified} className="text-amber-700 dark:text-amber-300" />
      <ChangeMetric label="D" value={summary.deleted} className="text-rose-700 dark:text-rose-300" />
      <ChangeMetric label="U" value={summary.untracked} className="text-blue-700 dark:text-blue-300" />
    </div>
  );
}

function ChangeRow({
  change,
  isSelected,
  isChecked,
  onSelect,
  onOpen,
  onToggle,
}: {
  change: GitChange;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (path: string | null) => void;
  onOpen: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(change.path)}
      onDoubleClick={() => onOpen(change.path)}
      className={cn(
        "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/50 p-2 text-left transition-colors",
        "hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "border-primary/50 bg-primary/5",
      )}
    >
      <ChangeCheckbox path={change.path} checked={isChecked} onToggle={onToggle} />
      <span className="min-w-0">
        <span className="block truncate font-mono text-xs">{change.path}</span>
        <span className="text-[10px] text-muted-foreground">
          {change.staged ? "Staged" : "Unstaged"}
          {change.isLive ? " / live" : ""}
        </span>
      </span>
      <Badge variant="outline" className={cn("shrink-0", STATUS_STYLES[change.status])}>
        {STATUS_LABELS[change.status] || "M"}
      </Badge>
    </button>
  );
}

function ChangeCheckbox({
  path,
  checked,
  onToggle,
}: {
  path: string;
  checked: boolean;
  onToggle: (path: string) => void;
}) {
  const toggle = () => onToggle(path);

  return (
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          toggle();
        }
      }}
      className={cn(
        "grid h-4 w-4 place-items-center rounded border border-border",
        checked && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : null}
    </span>
  );
}

function ChangesActionBar({
  commitMessage,
  selectedOrCurrentPath,
  isStaging,
  isUnstaging,
  isCommitting,
  isPulling,
  isPushing,
  onCommitMessageChange,
  onStage,
  onUnstage,
  onCommit,
  onPull,
  onPush,
}: ChangesPanelProps) {
  const hasSelectedPath = selectedOrCurrentPath.length > 0;

  return (
    <div className="grid gap-2 border-t p-2">
      <Textarea
        value={commitMessage}
        onChange={(event) => onCommitMessageChange(event.target.value)}
        placeholder="Commit message"
        className="min-h-14 resize-none px-2 py-1.5 text-xs"
      />
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 justify-center gap-1 px-2 text-[11px]"
          disabled={!hasSelectedPath || isStaging}
          onClick={onStage}
        >
          <Check className="h-3.5 w-3.5" />
          Stage
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 justify-center gap-1 px-2 text-[11px]"
          disabled={!hasSelectedPath || isUnstaging}
          onClick={onUnstage}
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          Unstage
        </Button>
        <Button
          size="sm"
          className="h-8 justify-center gap-1 px-2 text-[11px]"
          disabled={!commitMessage.trim() || isCommitting}
          onClick={onCommit}
        >
          <GitCommitHorizontal className="h-3.5 w-3.5" />
          Commit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 justify-center gap-1 px-2 text-[11px]"
          disabled={isPulling}
          onClick={onPull}
        >
          <Download className="h-3.5 w-3.5" />
          Pull
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 justify-center gap-1 px-2 text-[11px]"
          disabled={isPushing || isPulling}
          onClick={onPush}
        >
          <Send className="h-3.5 w-3.5" />
          Push
        </Button>
      </div>
    </div>
  );
}
