/**
 * @file RepositoryPanel.tsx
 * @description Repository settings and Git worktree list panel for SQL Lab workspace.
 */

import { useState } from "react";
import { FolderOpen, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceTreePanel } from "./SourceTreePanel";
import type { GitStatus, GitWorktree, WorkspaceFile } from "./workspace-panel-types";

type RepositoryPanelProps = {
  workspaceName: string;
  projectState: string;
  rootPath: string;
  scriptsFolder: string;
  gitStatus?: GitStatus;
  worktrees: GitWorktree[];
  sourceFiles: WorkspaceFile[];
  selectedSourcePath?: string | null;
  isLoadingSourceTree: boolean;
  isSaving: boolean;
  isActivating: boolean;
  isRemoving: boolean;
  onRootPathChange: (value: string) => void;
  onScriptsFolderChange: (value: string) => void;
  onChooseRootFolder: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onRefreshSourceTree: () => void;
  onSelectSourceFile: (path: string) => void;
  onActivateWorktree: (path: string) => void;
  onRemoveWorktree: (path: string) => void;
};

export function RepositoryPanel(props: RepositoryPanelProps) {
  const [isRootDialogOpen, setIsRootDialogOpen] = useState(false);
  const repositoryName = getRepositoryName(props.rootPath, props.workspaceName);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <span className="truncate">Ddirectory</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsRootDialogOpen(true)}
            aria-label="Import root directory"
            title="Import root directory"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={props.onRefresh} aria-label="Refresh repository" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 py-3">
        <div className="grid gap-4">
          <SourceTreePanel
            repositoryName={repositoryName}
            files={props.sourceFiles}
            selectedPath={props.selectedSourcePath}
            isLoading={props.isLoadingSourceTree}
            onRefresh={props.onRefreshSourceTree}
            onSelectFile={props.onSelectSourceFile}
          />
        </div>
      </ScrollArea>
      <RepositoryRootDialog {...props} open={isRootDialogOpen} onOpenChange={setIsRootDialogOpen} />
    </div>
  );
}

function RepositoryRootDialog({
  open,
  onOpenChange,
  rootPath,
  scriptsFolder,
  isSaving,
  onRootPathChange,
  onScriptsFolderChange,
  onChooseRootFolder,
  onSave,
}: Pick<RepositoryPanelProps, "rootPath" | "scriptsFolder" | "isSaving" | "onRootPathChange" | "onScriptsFolderChange" | "onChooseRootFolder" | "onSave"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Root Directory</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="workspaceRoot">Git root</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2">
              <Input id="workspaceRoot" value={rootPath} onChange={(event) => onRootPathChange(event.target.value)} className="h-10 rounded-md font-mono" />
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-md" onClick={onChooseRootFolder} aria-label="Choose root directory">
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scriptsFolder">Scripts folder</Label>
            <Input id="scriptsFolder" value={scriptsFolder} onChange={(event) => onScriptsFolderChange(event.target.value)} className="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !rootPath.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getRepositoryName(rootPath: string, fallbackName: string) {
  const normalizedPath = rootPath.trim().replace(/[\\/]+$/, "");
  const nameFromPath = normalizedPath.split(/[\\/]/).filter(Boolean).pop();
  return nameFromPath || fallbackName || "Repository";
}
