/**
 * @file CommitGraphPanel.tsx
 * @description Commit graph panel for SQL Lab workspace Git history and remote actions.
 */

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpToLine, CircleDot, FileText, GitGraph, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { workspaceApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { EmptyState } from "./WorkspacePanelShared";
import type { GitCommit, GitCommitFile, GitHistory, GitStatus } from "./workspace-panel-types";

type GitRefInfo = {
  label: string;
  kind: "local" | "remote" | "tag";
};

type GraphTone = "committed" | "outgoing" | "incoming" | "currentBranch" | "otherBranch";

const GRAPH_TONE_STYLES: Record<GraphTone, { dot: string; line: string; text: string }> = {
  committed: {
    dot: "bg-muted-foreground/60",
    line: "bg-border",
    text: "text-muted-foreground",
  },
  outgoing: {
    dot: "bg-amber-500",
    line: "bg-amber-500/40",
    text: "text-amber-700 dark:text-amber-300",
  },
  incoming: {
    dot: "bg-violet-500",
    line: "bg-violet-500/40",
    text: "text-violet-700 dark:text-violet-300",
  },
  currentBranch: {
    dot: "bg-sky-500",
    line: "bg-sky-500/35",
    text: "text-sky-700 dark:text-sky-300",
  },
  otherBranch: {
    dot: "bg-emerald-500",
    line: "bg-emerald-500/35",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

type CommitGraphPanelProps = {
  history?: GitHistory;
  gitStatus?: GitStatus;
  selectedCommitHash?: string | null;
  selectedFilePath?: string | null;
  isPulling: boolean;
  isPushing: boolean;
  onSelectCommit: (commitHash: string) => void;
  onSelectFile: (commitHash: string, path: string) => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
};

export function CommitGraphPanel({
  history,
  gitStatus,
  selectedCommitHash,
  selectedFilePath,
  isPulling,
  isPushing,
  onSelectCommit,
  onSelectFile,
  onPull,
  onPush,
  onRefresh,
}: CommitGraphPanelProps) {
  const commits = history?.commits || [];
  const isRepository = Boolean(gitStatus?.isRepository);
  const hasOutgoing = Boolean(gitStatus?.aheadCount);
  const hasIncoming = Boolean(gitStatus?.behindCount);
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  const hasExpandedCommits = expandedCommits.size > 0;

  const commitHashes = useMemo(() => commits.map((commit) => commit.hash), [commits]);
  const toneByCommit = useMemo(() => buildCommitToneMap(commits, gitStatus), [commits, gitStatus]);
  const toggleCommit = (commitHash: string) => {
    setExpandedCommits((current) => {
      const next = new Set(current);
      if (next.has(commitHash)) {
        next.delete(commitHash);
      } else {
        next.add(commitHash);
        onSelectCommit(commitHash);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <GraphHeader
        gitStatus={gitStatus}
        isPulling={isPulling}
        isPushing={isPushing}
        canPull={isRepository && !isPulling}
        canPush={isRepository && !isPushing && !isPulling}
        onPull={onPull}
        onPush={onPush}
        onRefresh={onRefresh}
      />
      <div className="flex h-8 items-center justify-between gap-2 border-b px-2 text-[10px] text-muted-foreground">
        <span className="truncate font-mono">{commits.length} commit(s)</span>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            disabled={commitHashes.length === 0}
            onClick={() => setExpandedCommits(new Set(commitHashes))}
          >
            Expand all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            disabled={!hasExpandedCommits}
            onClick={() => setExpandedCommits(new Set())}
          >
            Collapse all
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 border-t">
          <div className="py-1">
            {hasIncoming ? (
              <GraphGroupRow
                label={`Incoming Changes ${gitStatus?.branch || ""}`.trim()}
                subtext={`${gitStatus?.behindCount || 0} commit(s) behind remote`}
                tone="incoming"
              />
            ) : null}
            {hasOutgoing ? (
              <GraphGroupRow
                label={`Outgoing Changes ${gitStatus?.branch || ""}`.trim()}
                subtext={`${gitStatus?.aheadCount || 0} commit(s) ahead of remote`}
                tone="outgoing"
              />
            ) : null}
            {commits.length === 0 ? (
              <div className="p-3">
                <EmptyState title="No commit history" text="Git graph appears after the first commit." />
              </div>
            ) : (
              commits.map((commit, index) => (
              <GraphCommitRow
                  key={commit.hash}
                  commit={commit}
                  isLast={index === commits.length - 1}
                  isSelected={selectedCommitHash === commit.hash}
                  isExpanded={expandedCommits.has(commit.hash)}
                  tone={toneByCommit.get(commit.hash) || "committed"}
                  onToggle={toggleCommit}
                >
                  {expandedCommits.has(commit.hash) ? (
                    <CommitFileList
                      commitHash={commit.hash}
                      selectedFilePath={selectedFilePath}
                      onSelectFile={onSelectFile}
                    />
                  ) : null}
                </GraphCommitRow>
              ))
            )}
          </div>
      </ScrollArea>
    </div>
  );
}

function GraphHeader({
  gitStatus,
  isPulling,
  isPushing,
  canPull,
  canPush,
  onPull,
  onPush,
  onRefresh,
}: {
  gitStatus?: GitStatus;
  isPulling: boolean;
  isPushing: boolean;
  canPull: boolean;
  canPush: boolean;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid shrink-0 gap-2 border-b px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
          <GitGraph className="h-3.5 w-3.5" />
          <span>Graph</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <GraphIconButton
            label="Pull"
            icon={<ArrowDownToLine className={cn("h-3.5 w-3.5", isPulling && "animate-pulse")} />}
            disabled={!canPull}
            onClick={onPull}
          />
          <GraphIconButton
            label="Push"
            icon={<ArrowUpToLine className={cn("h-3.5 w-3.5", isPushing && "animate-pulse")} />}
            disabled={!canPush}
            onClick={onPush}
          />
          <GraphIconButton label="Refresh graph" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRefresh} />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="min-w-0 truncate font-mono">{gitStatus?.branch || "No repository"}</span>
        <Badge variant="outline" className="h-5 shrink-0 px-1.5 font-mono text-[10px]">
          ahead {gitStatus?.aheadCount || 0}
        </Badge>
        <Badge variant="outline" className="h-5 shrink-0 px-1.5 font-mono text-[10px]">
          behind {gitStatus?.behindCount || 0}
        </Badge>
      </div>
    </div>
  );
}

function GraphIconButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-7 w-7"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
}

function GraphGroupRow({ label, subtext, tone }: { label: string; subtext: string; tone: Extract<GraphTone, "incoming" | "outgoing"> }) {
  const toneStyle = GRAPH_TONE_STYLES[tone];

  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center px-2 py-1 text-xs">
      <div className="flex justify-center">
        <CircleDot className={cn("h-4 w-4", toneStyle.text)} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{subtext}</p>
      </div>
    </div>
  );
}

function GraphCommitRow({
  commit,
  isLast,
  isSelected,
  isExpanded,
  tone,
  onToggle,
  children,
}: {
  commit: GitCommit;
  isLast: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  tone: GraphTone;
  onToggle: (commitHash: string) => void;
  children?: ReactNode;
}) {
  const refs = parseGitRefs(commit.refs);
  const visibleRefs = refs.slice(0, 2);
  const toneStyle = GRAPH_TONE_STYLES[tone];

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(commit.hash)}
        className={cn(
          "group grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-stretch px-2 py-1 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected && "bg-primary/10",
        )}
        title={`${commit.subject}\n${commit.shortHash} - ${commit.author} - ${commit.relativeDate}`}
      >
        <div className="relative flex justify-center">
          {!isLast ? <span className={cn("absolute bottom-[-0.25rem] top-4 w-px", toneStyle.line)} /> : null}
          {commit.parents?.length && commit.parents.length > 1 ? <span className={cn("absolute left-6 top-4 h-px w-3", toneStyle.line)} /> : null}
          <span className={cn("relative mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-background", toneStyle.dot)} />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate text-xs font-medium leading-4 text-foreground">{commit.subject}</p>
            {visibleRefs.map((ref) => (
              <GraphRefBadge key={ref.label} refInfo={ref} />
            ))}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="shrink-0 font-mono">{commit.shortHash}</span>
            <span className="min-w-0 truncate">{commit.author}</span>
            <span className="shrink-0">{commit.relativeDate}</span>
          </div>
        </div>
      </button>
      {children}
    </div>
  );
}

function CommitFileList({
  commitHash,
  selectedFilePath,
  onSelectFile,
}: {
  commitHash: string;
  selectedFilePath?: string | null;
  onSelectFile: (commitHash: string, path: string) => void;
}) {
  const detailQuery = useQuery({
    queryKey: ["workspaceGitCommit", commitHash],
    queryFn: () => workspaceApi.getGitCommit(commitHash),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const detail = detailQuery.data;

  if (detailQuery.isLoading) {
    return <CommitInlineMessage text="Loading changed files..." />;
  }

  if (!detail) {
    return <CommitInlineMessage text="Choose a commit to inspect changed files." />;
  }

  return (
    <div className="ml-9 border-l border-border/60 py-1 pl-2">
      {detail.files.length === 0 ? (
        <CommitInlineMessage text="This commit does not report changed files." />
      ) : (
        detail.files.map((file: GitCommitFile) => (
          <CommitFileRow
            key={`${file.status}-${file.path}`}
            file={file}
            isSelected={selectedFilePath === file.path}
            onSelect={(path) => onSelectFile(commitHash, path)}
          />
        ))
      )}
    </div>
  );
}

function CommitInlineMessage({ text }: { text: string }) {
  return <p className="px-2 py-1 text-[10px] text-muted-foreground">{text}</p>;
}

function CommitFileRow({
  file,
  isSelected,
  onSelect,
}: {
  file: GitCommitFile;
  isSelected: boolean;
  onSelect: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(file.path)}
      className={cn(
        "grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-1 rounded px-1.5 py-1 text-left text-xs transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "bg-primary/10 text-primary",
      )}
      title={file.oldPath ? `${file.oldPath} -> ${file.path}` : file.path}
    >
      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="min-w-0 truncate font-mono">{file.path}</span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
        +{file.additions} -{file.deletions}
      </span>
    </button>
  );
}

function GraphRefBadge({ refInfo }: { refInfo: GitRefInfo }) {
  return (
    <span
      className={cn(
        "max-w-24 shrink-0 truncate rounded-full border px-1.5 py-0.5 text-[10px] leading-none",
        refInfo.kind === "remote"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
          : refInfo.kind === "tag"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      )}
      title={refInfo.label}
    >
      {refInfo.label}
    </span>
  );
}

function buildCommitToneMap(commits: GitCommit[], gitStatus?: GitStatus) {
  const toneByCommit = new Map<string, GraphTone>();
  let activeTone: GraphTone = "committed";

  for (const commit of commits) {
    const refs = parseGitRefs(commit.refs);
    const directTone = getCommitGraphTone(refs, gitStatus);
    if (directTone !== "committed") {
      activeTone = directTone;
    }
    toneByCommit.set(commit.hash, activeTone);
  }

  return toneByCommit;
}

function getCommitGraphTone(refs: GitRefInfo[], gitStatus?: GitStatus): GraphTone {
  const currentBranch = gitStatus?.branch || "";
  const upstream = gitStatus?.upstream || "";
  const hasOutgoing = Boolean(gitStatus?.aheadCount);
  const hasIncoming = Boolean(gitStatus?.behindCount);
  const branchRefs = refs.filter((ref) => ref.kind !== "tag");

  if (hasOutgoing && refs.some((ref) => ref.kind === "local" && ref.label === currentBranch)) {
    return "outgoing";
  }

  if (hasIncoming && upstream && refs.some((ref) => ref.kind === "remote" && ref.label === upstream)) {
    return "incoming";
  }

  if (branchRefs.some((ref) => ref.label === currentBranch || ref.label === upstream)) {
    return "currentBranch";
  }

  if (branchRefs.length > 0) {
    return "otherBranch";
  }

  return "committed";
}

function parseGitRefs(rawRefs?: string | null): GitRefInfo[] {
  if (!rawRefs) return [];

  return rawRefs
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const label = item
        .replace(/^HEAD -> /, "")
        .replace(/^tag: /, "")
        .replace(/^origin\//, "origin/");
      const kind: GitRefInfo["kind"] = item.includes("origin/") ? "remote" : item.startsWith("tag:") ? "tag" : "local";
      return { label, kind };
    });
}
