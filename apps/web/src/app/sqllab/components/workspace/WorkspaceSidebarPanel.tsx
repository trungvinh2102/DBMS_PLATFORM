/**
 * @file WorkspaceSidebarPanel.tsx
 * @description Controller for SQL Lab workspace repository, source control, and commit graph panels.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { workspaceApi } from "@/lib/api-client";
import type { LeftActivityView } from "../../types";
import { useSQLLabContext } from "../../context/SQLLabContext";
import { ChangesPanel } from "./ChangesPanel";
import { CommitGraphPanel } from "./CommitGraphPanel";
import { RepositoryPanel } from "./RepositoryPanel";
import { ChangesSkeleton, GraphSkeleton, RepositorySkeleton } from "./WorkspacePanelSkeletons";
import { isTauriRuntime, openTauriFolder } from "./workspace-folder-dialog";
import {
  buildChangeSummary,
  chooseWorkspaceRootFolder,
  getScriptsRootLabel,
  toWorkspaceScriptPath,
} from "./workspace-git-utils";
import { useVisibleWorkspaceChanges } from "./use-visible-workspace-changes";
import type { GitBranch, GitChange, GitStatus, GitWorktree, WorkspaceFile } from "./workspace-panel-types";

const GIT_QUERY_OPTIONS = {
  staleTime: 15_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  placeholderData: (previousData: unknown) => previousData,
};

export function WorkspaceSidebarPanel({ view }: { view: Exclude<LeftActivityView, "database"> }) {
  const lab = useSQLLabContext();
  const queryClient = useQueryClient();
  const workspace = lab.workspaceScripts?.workspace;
  const [rootPath, setRootPath] = useState("");
  const [scriptsFolder, setScriptsFolder] = useState("sql");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const [selectedCommitFilePath, setSelectedCommitFilePath] = useState<string | null>(null);

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
  const branchesQuery = useQuery({
    queryKey: ["workspaceGitBranches"],
    queryFn: () => workspaceApi.getGitBranches(),
    enabled: view === "changes",
    ...GIT_QUERY_OPTIONS,
  });
  const sourceTreeQuery = useQuery({
    queryKey: ["workspaceFiles"],
    queryFn: () => workspaceApi.listFiles(),
    enabled: view === "repo",
    ...GIT_QUERY_OPTIONS,
  });
  const historyQuery = useQuery({
    queryKey: ["workspaceGitHistory"],
    queryFn: () => workspaceApi.getGitHistory(5000),
    enabled: view === "graph",
    ...GIT_QUERY_OPTIONS,
  });

  const gitStatus = gitStatusQuery.data as GitStatus | undefined;
  const changes = (gitStatus?.changes || []) as GitChange[];
  const worktrees = (worktreesQuery.data?.worktrees || []) as GitWorktree[];
  const branches = (branchesQuery.data?.branches || []) as GitBranch[];
  const sourceFiles = (sourceTreeQuery.data?.files || []) as WorkspaceFile[];
  const scriptsRootLabel = useMemo(() => getScriptsRootLabel(workspace), [workspace]);
  const visibleChanges = useVisibleWorkspaceChanges({ changes, scriptsRootLabel });

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
    queryClient.invalidateQueries({ queryKey: ["workspaceGitCommit"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitCommitFileDiff"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitWorktrees"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceGitBranches"] });
    queryClient.invalidateQueries({ queryKey: ["workspaceFiles"] });
  };

  const updateWorkspaceMutation = useMutation({
    mutationFn: () => workspaceApi.update({ rootPath, scriptsFolder }),
    onSuccess: () => {
      toast.success("Git workspace imported");
      refreshWorkspace();
    },
    onError: (error: Error) => toast.error(error.message || "Import failed"),
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
      lab.setGitPreviewCommitHash(null);
      refreshWorkspace();
    },
    onError: (error: Error) => toast.error(error.message || "Commit failed"),
  });

  const pullMutation = useMutation({
    mutationFn: () => workspaceApi.pullGit(),
    onSuccess: refreshAfterAction("Pulled remote changes"),
    onError: actionError("Pull failed"),
  });

  const pushMutation = useMutation({
    mutationFn: pushWithRebaseFallback,
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

  const checkoutBranchMutation = useMutation({
    mutationFn: (data: { branch: string; create?: boolean; startPoint?: string }) => workspaceApi.checkoutGitBranch(data),
    onSuccess: refreshAfterAction("Checked out branch"),
    onError: actionError("Checkout branch failed"),
  });

  function refreshAfterAction(defaultMessage: string) {
    return (result: { message?: string } = {}) => {
      toast.success(result.message || defaultMessage);
      setSelectedFiles([]);
      refreshWorkspace();
    };
  }

  function actionError(defaultMessage: string) {
    return (error: Error) => toast.error(error.message || defaultMessage);
  }

  async function pushWithRebaseFallback() {
    try {
      return await workspaceApi.pushGit();
    } catch (error) {
      if (!isRemoteAheadPushError(error)) throw error;
      toast.info("Remote has new commits. Pulling with rebase, then pushing again.");
      await workspaceApi.pullGit();
      return workspaceApi.pushGit();
    }
  }

  const handleChooseRootFolder = async () => {
    try {
      const selected = await chooseWorkspaceRootFolder({
        currentRootPath: rootPath,
        isTauri: isTauriRuntime(),
        openTauriFolder,
        pickBackendFolder: async (initialPath?: string) => (await workspaceApi.pickFolder({ initialPath }))?.path || null,
      });
      if (selected) setRootPath(selected);
    } catch (error) {
      if (!isAbortError(error)) toast.error(getErrorMessage(error, "Failed to open folder picker"));
    }
  };

  const openWorkspaceChange = async (path: string) => {
    const scriptPath = toWorkspaceScriptPath(path, scriptsRootLabel);
    if (!scriptPath) return;

    try {
      await lab.handleSelectWorkspaceScript({ path: scriptPath });
      lab.setGitPreviewPath(null);
      lab.setGitPreviewCommitHash(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to open workspace script"));
    }
  };

  const selectSourceFile = async (path: string) => {
    lab.setGitPreviewPath(path);
    lab.setGitPreviewCommitHash(null);
    if (!path.toLowerCase().endsWith(".sql")) return;
    await openWorkspaceChange(path);
  };

  const toggleSelectedFile = (path: string) => {
    setSelectedFiles((current) => (current.includes(path) ? current.filter((item) => item !== path) : [...current, path]));
    lab.setGitPreviewPath(path);
    lab.setGitPreviewCommitHash(null);
  };

  const selectedOrCurrentPath = selectedFiles.length ? selectedFiles : lab.gitPreviewPath ? [lab.gitPreviewPath] : [];
  const projectState = gitStatus?.isRepository ? (gitStatus.isClean ? "Clean" : `${gitStatus.changedCount} changed`) : "Git off";

  if (view === "repo") {
    if (gitStatusQuery.isLoading || worktreesQuery.isLoading) return <RepositorySkeleton />;

    return (
      <RepositoryPanel
        workspaceName={workspace?.name || "Local Workspace"}
        projectState={projectState}
        rootPath={rootPath}
        scriptsFolder={scriptsFolder}
        gitStatus={gitStatus}
        worktrees={worktrees}
        sourceFiles={sourceFiles}
        selectedSourcePath={lab.gitPreviewPath}
        isLoadingSourceTree={sourceTreeQuery.isLoading}
        isSaving={updateWorkspaceMutation.isPending}
        isActivating={activateWorktreeMutation.isPending}
        isRemoving={removeWorktreeMutation.isPending}
        onRootPathChange={setRootPath}
        onScriptsFolderChange={setScriptsFolder}
        onChooseRootFolder={handleChooseRootFolder}
        onSave={() => updateWorkspaceMutation.mutate()}
        onRefresh={refreshWorkspace}
        onRefreshSourceTree={() => sourceTreeQuery.refetch()}
        onSelectSourceFile={(path) => {
          void selectSourceFile(path);
        }}
        onActivateWorktree={(path) => activateWorktreeMutation.mutate(path)}
        onRemoveWorktree={(path) => {
          if (window.confirm("Remove this Git worktree folder?")) removeWorktreeMutation.mutate(path);
        }}
      />
    );
  }

  if (view === "graph") {
    if (historyQuery.isLoading) return <GraphSkeleton />;

    return (
      <CommitGraphPanel
        history={historyQuery.data}
        gitStatus={gitStatus}
        selectedCommitHash={selectedCommitHash}
        selectedFilePath={selectedCommitFilePath}
        isPulling={pullMutation.isPending}
        isPushing={pushMutation.isPending}
        onSelectCommit={(commitHash) => {
          setSelectedCommitHash(commitHash);
          setSelectedCommitFilePath(null);
        }}
        onSelectFile={(commitHash, path) => {
          setSelectedCommitHash(commitHash);
          setSelectedCommitFilePath(path);
          lab.setGitPreviewPath(path);
          lab.setGitPreviewCommitHash(commitHash);
        }}
        onPull={() => pullMutation.mutate()}
        onPush={() => pushMutation.mutate()}
        onRefresh={refreshWorkspace}
      />
    );
  }

  if (gitStatusQuery.isLoading) return <ChangesSkeleton />;

  return (
    <ChangesPanel
      changes={visibleChanges}
      gitStatus={gitStatus}
      branches={branches}
      selectedPath={lab.gitPreviewPath}
      selectedFiles={selectedFiles}
      commitMessage={commitMessage}
      summary={buildChangeSummary(visibleChanges)}
      isStaging={stageMutation.isPending}
      isUnstaging={unstageMutation.isPending}
      isCommitting={commitMutation.isPending}
      isCheckingOutBranch={checkoutBranchMutation.isPending}
      isPulling={pullMutation.isPending}
      isPushing={pushMutation.isPending}
      selectedOrCurrentPath={selectedOrCurrentPath}
      onSelect={(path) => {
        lab.setGitPreviewPath(path);
        lab.setGitPreviewCommitHash(null);
      }}
      onOpen={openWorkspaceChange}
      onToggle={toggleSelectedFile}
      onCommitMessageChange={setCommitMessage}
      onStage={() => stageMutation.mutate(selectedOrCurrentPath)}
      onUnstage={() => unstageMutation.mutate(selectedOrCurrentPath)}
      onCommit={() => commitMutation.mutate()}
      onCheckoutBranch={(branch) => checkoutBranchMutation.mutate({ branch })}
      onCreateBranch={(branch, startPoint) => checkoutBranchMutation.mutate({ branch, create: true, startPoint })}
      onPull={() => pullMutation.mutate()}
      onPush={() => pushMutation.mutate()}
      onRefresh={refreshWorkspace}
    />
  );
}

function isRemoteAheadPushError(error: unknown) {
  return getErrorMessage(error).includes("Remote has new commits");
}

function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function getErrorMessage(error: unknown, fallback = "") {
  return error instanceof Error ? error.message : String(error || fallback);
}
