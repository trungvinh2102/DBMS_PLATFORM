/**
 * @file WorkspaceSidebarPanel.tsx
 * @description Left sidebar panels for workspace repository, Git changes, and commit graph management.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  CircleDot,
  Download,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitCommitHorizontal,
  GitGraph,
  GitPullRequest,
  MoreHorizontal,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { workspaceApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { LeftActivityView } from "../../types";
import { useSQLLabContext } from "../../context/SQLLabContext";
import { buildUnifiedDiff } from "../../utils/unified-diff";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  buildChangeSummary,
  chooseWorkspaceRootFolder,
  getScriptsRootLabel,
  toGitPath,
  toWorkspaceScriptPath,
} from "./workspace-git-utils";

type GitRefInfo = {
  label: string;
  kind: "local" | "remote" | "tag";
};

const GRAPH_COLORS = [
  { dot: "bg-violet-500" },
  { dot: "bg-sky-500" },
  { dot: "bg-emerald-500" },
  { dot: "bg-amber-500" },
  { dot: "bg-rose-500" },
];

const GIT_QUERY_OPTIONS = {
  staleTime: 15_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  placeholderData: (previousData: any) => previousData,
};

export function WorkspaceSidebarPanel({ view }: { view: Exclude<LeftActivityView, "database"> }) {
  const lab = useSQLLabContext();
  const queryClient = useQueryClient();
  const workspace = lab.workspaceScripts?.workspace;
  const [rootPath, setRootPath] = useState("");
  const [scriptsFolder, setScriptsFolder] = useState("sql");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState("");

  const gitStatusQuery = useQuery({
    queryKey: ["workspaceGitStatus"],
    queryFn: () => workspaceApi.getGitStatus(),
    ...GIT_QUERY_OPTIONS,
  });
  const worktreesQuery = useQuery({
    queryKey: ["workspaceGitWorktrees"],
    queryFn: () => workspaceApi.getGitWorktrees(),
    enabled: view === "repo",
    ...GIT_QUERY_OPTIONS,
  });
  const historyQuery = useQuery({
    queryKey: ["workspaceGitHistory"],
    queryFn: () => workspaceApi.getGitHistory(60),
    enabled: view === "graph",
    ...GIT_QUERY_OPTIONS,
  });

  const gitStatus = gitStatusQuery.data;
  const changes = gitStatus?.changes || [];
  const worktrees = worktreesQuery.data?.worktrees || [];
  const scriptsRootLabel = useMemo(() => getScriptsRootLabel(workspace), [workspace]);
  const activeTab = lab.tabs.find((tab: any) => tab.id === lab.activeTabId);
  const activeGitPath = toGitPath(activeTab?.scriptPath, scriptsRootLabel);
  const activeScriptDiff = useMemo(() => {
    if (!activeGitPath || activeTab?.workspaceBaseSql === undefined || activeTab?.sql === undefined) return "";
    return buildUnifiedDiff(activeTab.workspaceBaseSql, activeTab.sql, activeGitPath);
  }, [activeGitPath, activeTab?.workspaceBaseSql, activeTab?.sql]);

  const visibleChanges = useMemo(() => {
    if (!activeGitPath || !activeScriptDiff || changes.some((change: any) => change.path === activeGitPath)) return changes;
    return [{ path: activeGitPath, status: "modified", staged: false, worktreeStatus: "M", isLive: true }, ...changes];
  }, [activeGitPath, activeScriptDiff, changes]);

  useEffect(() => {
    if (!workspace) return;
    setRootPath(workspace.rootPath || "");
    if (scriptsRootLabel) setScriptsFolder(scriptsRootLabel);
  }, [workspace, scriptsRootLabel]);

  const refreshWorkspace = () => {
    lab.refetchWorkspaceScripts();
    queryClient.invalidateQueries({ queryKey: ["workspaceScripts"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitStatus"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitDiff"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitHistory"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitWorktrees"] });
  };

  const updateWorkspaceMutation = useMutation({
    mutationFn: () => workspaceApi.update({ rootPath, scriptsFolder }),
    onSuccess: () => {
      toast.success("Git workspace imported");
      refreshWorkspace();
    },
    onError: (error: any) => toast.error(error?.message || "Import failed"),
  });

  const stageMutation = useMutation({
    mutationFn: (paths: string[]) => workspaceApi.stageGitPaths(paths),
    onSuccess: refreshAfterAction("Files staged"),
  });

  const unstageMutation = useMutation({
    mutationFn: (paths: string[]) => workspaceApi.unstageGitPaths(paths),
    onSuccess: refreshAfterAction("Files unstaged"),
  });

  const commitMutation = useMutation({
    mutationFn: () => workspaceApi.commitGitPaths({ message: commitMessage, paths: selectedFiles }),
    onSuccess: () => {
      toast.success("Committed working tree");
      setCommitMessage("");
      setSelectedFiles([]);
      lab.setGitPreviewPath(null);
      refreshWorkspace();
    },
    onError: (error: any) => toast.error(error?.message || "Commit failed"),
  });

  const pullMutation = useMutation({
    mutationFn: () => workspaceApi.pullGit(),
    onSuccess: refreshAfterAction("Pulled remote changes"),
    onError: actionError("Pull failed"),
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      try {
        return await workspaceApi.pushGit();
      } catch (error: any) {
        if (!isRemoteAheadPushError(error)) throw error;
        toast.info("Remote has new commits. Pulling with rebase, then pushing again.");
        await workspaceApi.pullGit();
        return workspaceApi.pushGit();
      }
    },
    onSuccess: refreshAfterAction("Pushed current branch"),
    onError: actionError("Push failed"),
  });

  const activateWorktreeMutation = useMutation({
    mutationFn: (path: string) => workspaceApi.activateGitWorktree(path),
    onSuccess: refreshAfterAction("Active worktree updated"),
    onError: actionError("Failed to use worktree"),
  });

  const removeWorktreeMutation = useMutation({
    mutationFn: (path: string) => workspaceApi.removeGitWorktree({ path }),
    onSuccess: refreshAfterAction("Removed worktree"),
    onError: actionError("Remove worktree failed"),
  });

  function refreshAfterAction(defaultMessage: string) {
    return (result: any) => {
      toast.success(result?.message || defaultMessage);
      setSelectedFiles([]);
      refreshWorkspace();
    };
  }

  function actionError(defaultMessage: string) {
    return (error: any) => toast.error(error?.message || defaultMessage);
  }

  function isRemoteAheadPushError(error: any) {
    return String(error?.message || error).includes("Remote has new commits");
  }

  const handleChooseRootFolder = async () => {
    try {
      const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__?.invoke);
      const selected = await chooseWorkspaceRootFolder({
        currentRootPath: rootPath,
        isTauri,
        openTauriFolder: async (defaultPath?: string) => {
          const { open } = await import("@tauri-apps/plugin-dialog");
          const result = await open({ directory: true, multiple: false, defaultPath });
          return typeof result === "string" ? result : null;
        },
        pickBackendFolder: async (initialPath?: string) => (await workspaceApi.pickFolder({ initialPath }))?.path || null,
      });
      if (selected) setRootPath(selected);
    } catch (error: any) {
      if (error?.name !== "AbortError") toast.error(error?.message || "Failed to open folder picker");
    }
  };

  const openWorkspaceChange = async (path: string) => {
    const scriptPath = toWorkspaceScriptPath(path, scriptsRootLabel);
    if (!scriptPath) return;
    try {
      await lab.handleSelectWorkspaceScript({ path: scriptPath });
      lab.setGitPreviewPath(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to open workspace script");
    }
  };

  const toggleSelectedFile = (path: string) => {
    setSelectedFiles((current) => (current.includes(path) ? current.filter((item) => item !== path) : [...current, path]));
    lab.setGitPreviewPath(path);
  };

  const selectedOrCurrentPath = selectedFiles.length ? selectedFiles : lab.gitPreviewPath ? [lab.gitPreviewPath] : [];
  const projectState = gitStatus?.isRepository ? (gitStatus.isClean ? "Clean" : `${gitStatus.changedCount} changed`) : "Git off";

  if (view === "repo") {
    if (gitStatusQuery.isLoading || worktreesQuery.isLoading) {
      return <RepositorySkeleton />;
    }

    return (
      <RepositoryPanel
        workspaceName={workspace?.name || "Local Workspace"}
        projectState={projectState}
        rootPath={rootPath}
        scriptsFolder={scriptsFolder}
        gitStatus={gitStatus}
        worktrees={worktrees}
        isSaving={updateWorkspaceMutation.isPending}
        isActivating={activateWorktreeMutation.isPending}
        isRemoving={removeWorktreeMutation.isPending}
        onRootPathChange={setRootPath}
        onScriptsFolderChange={setScriptsFolder}
        onChooseRootFolder={handleChooseRootFolder}
        onSave={() => updateWorkspaceMutation.mutate()}
        onRefresh={refreshWorkspace}
        onActivateWorktree={(path: string) => activateWorktreeMutation.mutate(path)}
        onRemoveWorktree={(path: string) => {
          if (window.confirm("Remove this Git worktree folder?")) removeWorktreeMutation.mutate(path);
        }}
      />
    );
  }

  if (view === "graph") {
    if (historyQuery.isLoading) return <GraphSkeleton />;
    return <CommitGraph history={historyQuery.data} gitStatus={gitStatus} onRefresh={refreshWorkspace} />;
  }

  if (gitStatusQuery.isLoading) return <ChangesSkeleton />;

  return (
    <ChangesPanel
      changes={visibleChanges}
      selectedPath={lab.gitPreviewPath}
      selectedFiles={selectedFiles}
      commitMessage={commitMessage}
      summary={buildChangeSummary(visibleChanges)}
      isStaging={stageMutation.isPending}
      isUnstaging={unstageMutation.isPending}
      isCommitting={commitMutation.isPending}
      isPulling={pullMutation.isPending}
      isPushing={pushMutation.isPending}
      selectedOrCurrentPath={selectedOrCurrentPath}
      onSelect={lab.setGitPreviewPath}
      onOpen={openWorkspaceChange}
      onToggle={toggleSelectedFile}
      onCommitMessageChange={setCommitMessage}
      onStage={() => stageMutation.mutate(selectedOrCurrentPath)}
      onUnstage={() => unstageMutation.mutate(selectedOrCurrentPath)}
      onCommit={() => commitMutation.mutate()}
      onPull={() => pullMutation.mutate()}
      onPush={() => pushMutation.mutate()}
      onRefresh={refreshWorkspace}
    />
  );
}

function RepositorySkeleton() {
  return (
    <PanelSkeleton titleWidth="w-24">
      <SkeletonBlock className="h-16" />
      <SkeletonLine className="w-32" />
      <SkeletonLine />
      <SkeletonLine className="w-24" />
      <SkeletonLine />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </PanelSkeleton>
  );
}

function ChangesSkeleton() {
  return (
    <PanelSkeleton titleWidth="w-28">
      <div className="flex gap-2">
        <SkeletonPill />
        <SkeletonPill />
        <SkeletonPill />
        <SkeletonPill />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-md border border-border/50 p-2">
          <span className="h-4 w-4 animate-pulse rounded border bg-muted" />
          <span className="grid gap-1">
            <SkeletonLine />
            <SkeletonLine className="w-20" />
          </span>
          <SkeletonPill />
        </div>
      ))}
    </PanelSkeleton>
  );
}

function GraphSkeleton() {
  return (
    <PanelSkeleton titleWidth="w-16" compact>
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center px-2 py-1">
          <div className="relative flex justify-center">
            <span className="absolute bottom-[-0.5rem] top-4 w-px bg-border" />
            <span className="relative mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="grid min-w-0 gap-1">
            <SkeletonLine />
            <SkeletonLine className="w-28" />
          </div>
        </div>
      ))}
    </PanelSkeleton>
  );
}

function PanelSkeleton({ children, titleWidth, compact = false }: { children: ReactNode; titleWidth: string; compact?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className={cn("h-3 animate-pulse rounded bg-muted", titleWidth)} />
        <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
      </div>
      <div className={cn("grid gap-3", compact ? "py-2" : "p-3")}>{children}</div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md border border-border/60 bg-muted/40", className)} />;
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("h-3 animate-pulse rounded bg-muted", className || "w-full")} />;
}

function SkeletonPill() {
  return <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />;
}

function RepositoryPanel(props: any) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader icon={<FolderGit2 className="h-4 w-4" />} title="Repository" action={props.onRefresh} />
      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        <div className="grid gap-4">
          <div className="grid gap-3">
            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Workspace</p>
              <p className="mt-1 truncate font-mono text-sm font-semibold">{props.workspaceName}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workspaceRoot">Existing Git root</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                <Input id="workspaceRoot" value={props.rootPath} onChange={(event) => props.onRootPathChange(event.target.value)} />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={props.onChooseRootFolder}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scriptsFolder">Scripts folder</Label>
              <Input id="scriptsFolder" value={props.scriptsFolder} onChange={(event) => props.onScriptsFolderChange(event.target.value)} />
            </div>
            <Button size="sm" onClick={props.onSave} disabled={props.isSaving || !props.rootPath.trim()}>
              <Save className="mr-2 h-4 w-4" />
              Import
            </Button>
          </div>
          <RepositorySummary gitStatus={props.gitStatus} projectState={props.projectState} />
          <WorktreeList {...props} />
        </div>
      </ScrollArea>
    </div>
  );
}

function RepositorySummary({ gitStatus, projectState }: any) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          Status
        </span>
        <Badge variant="outline" className={cn(gitStatus?.isClean && gitStatus?.isRepository && "text-emerald-600")}>{projectState}</Badge>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        <Metric label="Branch" value={gitStatus?.branch || "-"} />
        <Metric label="Upstream" value={gitStatus?.upstream || "-"} />
        <Metric label="Staged" value={gitStatus?.stagedCount || 0} />
        <Metric label="Ahead / behind" value={`${gitStatus?.aheadCount || 0} / ${gitStatus?.behindCount || 0}`} />
      </div>
    </div>
  );
}

function WorktreeList(props: any) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
          <FolderGit2 className="h-3.5 w-3.5" />
          Worktrees
        </span>
        <Badge variant="outline">{props.worktrees.length}</Badge>
      </div>
      <div className="grid gap-2">
        {props.worktrees.length === 0 ? (
          <EmptyState title="No worktrees" text="Git has not reported worktrees for this workspace." />
        ) : (
          props.worktrees.map((worktree: any) => (
            <div key={worktree.path} className="min-w-0 rounded-md border border-border/50 px-2 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono">{worktree.branch || "detached"}</span>
                {worktree.isCurrent ? <Badge variant="outline">Current</Badge> : null}
              </div>
              <p className="mt-1 truncate font-mono text-muted-foreground">{worktree.path}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{worktree.changedCount || 0} changed</span>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" className="h-7 px-2" disabled={worktree.isCurrent || props.isActivating} onClick={() => props.onActivateWorktree(worktree.path)}>Use</Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={worktree.isCurrent || props.isRemoving} onClick={() => props.onRemoveWorktree(worktree.path)} aria-label={`Remove ${worktree.branch || worktree.path}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChangesPanel(props: any) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader icon={<GitPullRequest className="h-4 w-4" />} title="Source Control" action={props.onRefresh} />
      <div className="flex flex-wrap gap-2 border-b px-3 py-2">
        <ChangeMetric label="A" value={props.summary.added} className="text-sky-700 dark:text-sky-300" />
        <ChangeMetric label="M" value={props.summary.modified} className="text-amber-700 dark:text-amber-300" />
        <ChangeMetric label="D" value={props.summary.deleted} className="text-rose-700 dark:text-rose-300" />
        <ChangeMetric label="U" value={props.summary.untracked} className="text-blue-700 dark:text-blue-300" />
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        <div className="grid gap-2">
          {props.changes.length === 0 ? (
            <EmptyState title="Working tree clean" text="No tracked or untracked changes in this worktree." />
          ) : (
            props.changes.map((change: any) => (
              <button
                key={change.path}
                type="button"
                onClick={() => props.onSelect(change.path)}
                onDoubleClick={() => props.onOpen(change.path)}
                className={cn(
                  "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/50 p-2 text-left transition-colors",
                  "hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  props.selectedPath === change.path && "border-primary/50 bg-primary/5",
                )}
              >
                <span
                  role="checkbox"
                  aria-checked={props.selectedFiles.includes(change.path)}
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onToggle(change.path);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      props.onToggle(change.path);
                    }
                  }}
                  className={cn("grid h-4 w-4 place-items-center rounded border border-border", props.selectedFiles.includes(change.path) && "border-primary bg-primary text-primary-foreground")}
                >
                  {props.selectedFiles.includes(change.path) ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs">{change.path}</span>
                  <span className="text-[10px] text-muted-foreground">{change.staged ? "Staged" : "Unstaged"}{change.isLive ? " / live" : ""}</span>
                </span>
                <Badge variant="outline" className={cn("shrink-0", STATUS_STYLES[change.status])}>{STATUS_LABELS[change.status] || "M"}</Badge>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="grid gap-2 border-t p-2">
        <Textarea
          value={props.commitMessage}
          onChange={(event) => props.onCommitMessageChange(event.target.value)}
          placeholder="Commit message"
          className="min-h-14 resize-none px-2 py-1.5 text-xs"
        />
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" variant="outline" className="h-8 justify-center gap-1 px-2 text-[11px]" disabled={!props.selectedOrCurrentPath.length || props.isStaging} onClick={props.onStage}>
            <Check className="h-3.5 w-3.5" />
            Stage
          </Button>
          <Button size="sm" variant="outline" className="h-8 justify-center gap-1 px-2 text-[11px]" disabled={!props.selectedOrCurrentPath.length || props.isUnstaging} onClick={props.onUnstage}>
            <GitPullRequest className="h-3.5 w-3.5" />
            Unstage
          </Button>
          <Button size="sm" className="h-8 justify-center gap-1 px-2 text-[11px]" disabled={!props.commitMessage.trim() || props.isCommitting} onClick={props.onCommit}>
            <GitCommitHorizontal className="h-3.5 w-3.5" />
            Commit
          </Button>
          <Button size="sm" variant="outline" className="h-8 justify-center gap-1 px-2 text-[11px]" disabled={props.isPulling} onClick={props.onPull}>
            <Download className="h-3.5 w-3.5" />
            Pull
          </Button>
          <Button size="sm" variant="outline" className="h-8 justify-center gap-1 px-2 text-[11px]" disabled={props.isPushing || props.isPulling} onClick={props.onPush}>
            <Send className="h-3.5 w-3.5" />
            Push
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommitGraph({ history, gitStatus, onRefresh }: { history: any; gitStatus: any; onRefresh: () => void }) {
  const commits = history?.commits || [];
  const hasOutgoing = Boolean(gitStatus?.aheadCount);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <GraphHeader onRefresh={onRefresh} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
          {hasOutgoing ? (
            <GraphGroupRow
              label={`Outgoing Changes ${gitStatus.branch || ""}`.trim()}
              subtext={`${gitStatus.aheadCount} commit(s) ahead of remote`}
            />
          ) : null}
          {commits.length === 0 ? (
            <div className="p-3">
              <EmptyState title="No commit history" text="Git graph appears after the first commit." />
            </div>
          ) : (
            commits.map((commit: any, index: number) => (
              <GraphCommitRow key={commit.hash} commit={commit} index={index} isLast={index === commits.length - 1} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function GraphHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b px-2">
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
        <GitGraph className="h-3.5 w-3.5" />
        <span>Graph</span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-1.5 text-[11px]" title="Auto graph layout">
          <GitBranch className="h-3.5 w-3.5" />
          Auto
        </Button>
        <GraphIconButton label="Pull" icon={<ArrowDownToLine className="h-3.5 w-3.5" />} />
        <GraphIconButton label="Push" icon={<ArrowUpToLine className="h-3.5 w-3.5" />} />
        <GraphIconButton label="Refresh graph" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRefresh} />
        <GraphIconButton label="More actions" icon={<MoreHorizontal className="h-3.5 w-3.5" />} />
      </div>
    </div>
  );
}

function GraphIconButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick?: () => void }) {
  return (
    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onClick} aria-label={label} title={label}>
      {icon}
    </Button>
  );
}

function GraphGroupRow({ label, subtext }: { label: string; subtext: string }) {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center px-2 py-1 text-xs">
      <div className="flex justify-center">
        <CircleDot className="h-4 w-4 text-sky-500" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{subtext}</p>
      </div>
    </div>
  );
}

function GraphCommitRow({ commit, index, isLast }: { commit: any; index: number; isLast: boolean }) {
  const refs = parseGitRefs(commit.refs);
  const color = GRAPH_COLORS[index % GRAPH_COLORS.length];

  return (
    <button
      type="button"
      className="group grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-stretch px-2 py-1 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`${commit.subject}\n${commit.shortHash} - ${commit.author} - ${commit.relativeDate}`}
    >
      <div className="relative flex justify-center">
        {!isLast ? <span className="absolute bottom-[-0.25rem] top-4 w-px bg-border" /> : null}
        {commit.parents?.length > 1 ? <span className="absolute left-6 top-4 h-px w-3 bg-border" /> : null}
        <span className={cn("relative mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-background", color.dot)} />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-xs font-medium leading-4 text-foreground">{commit.subject}</p>
          {refs.map((ref) => (
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
    })
    .slice(0, 2);
}

function PanelHeader({ icon, title, action }: { icon: ReactNode; title: string; action: () => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
      <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={action} aria-label={`Refresh ${title}`} title="Refresh">
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  const title = typeof value === "string" || typeof value === "number" ? String(value) : undefined;
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="shrink-0">{label}</span>
      <span title={title} className="min-w-0 truncate text-right font-mono text-foreground">{value}</span>
    </div>
  );
}

function ChangeMetric({ label, value, className }: { label: string; value: number; className?: string }) {
  return <Badge variant="outline" className={cn("gap-1 font-mono", className)}><span>{label}</span><span>{value}</span></Badge>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-border/70 px-3 py-8 text-center">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
