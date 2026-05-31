"""
workspace.py

Pydantic schemas for the local SQL script workspace API.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class WorkspaceConfig(BaseModel):
    name: str = "Local Workspace"
    rootPath: str
    scriptsPath: str
    gitEnabled: bool = False


class WorkspaceConfigUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    rootPath: Optional[str] = Field(default=None, min_length=1)
    scriptsFolder: Optional[str] = Field(default=None, min_length=1)
    initializeGit: bool = False


class WorkspaceFolderPickRequest(BaseModel):
    initialPath: Optional[str] = None


class WorkspaceFolderPickResponse(BaseModel):
    path: Optional[str] = None


class WorkspaceGitChange(BaseModel):
    path: str
    status: str
    staged: bool = False
    worktreeStatus: Optional[str] = None
    indexStatus: Optional[str] = None


class WorkspaceGitStatus(BaseModel):
    isRepository: bool = False
    branch: Optional[str] = None
    upstream: Optional[str] = None
    isClean: bool = True
    changedCount: int = 0
    stagedCount: int = 0
    unstagedCount: int = 0
    untrackedCount: int = 0
    aheadCount: int = 0
    behindCount: int = 0
    changes: List[WorkspaceGitChange] = Field(default_factory=list)
    lastCommit: Optional[str] = None


class WorkspaceGitDiff(BaseModel):
    path: str
    diff: str
    isBinary: bool = False


class WorkspaceGitActionPaths(BaseModel):
    paths: List[str] = Field(default_factory=list)


class WorkspaceGitCommitRequest(BaseModel):
    message: str = Field(min_length=1)
    paths: List[str] = Field(default_factory=list)


class WorkspaceGitActionResponse(BaseModel):
    ok: bool = True
    message: str


class WorkspaceGitWorktreeRemove(BaseModel):
    path: str = Field(min_length=1)
    force: bool = False


class WorkspaceGitWorktreeActivate(BaseModel):
    path: str = Field(min_length=1)


class WorkspaceGitCommit(BaseModel):
    hash: str
    shortHash: str
    parents: List[str] = Field(default_factory=list)
    author: str
    relativeDate: str
    subject: str
    refs: Optional[str] = None


class WorkspaceGitHistory(BaseModel):
    commits: List[WorkspaceGitCommit] = Field(default_factory=list)
    graph: str = ""


class WorkspaceGitWorktree(BaseModel):
    path: str
    name: Optional[str] = None
    repoRoot: Optional[str] = None
    branch: Optional[str] = None
    head: Optional[str] = None
    isCurrent: bool = False
    isBare: bool = False
    isDetached: bool = False
    isLocked: bool = False
    isMissing: bool = False
    prunable: Optional[str] = None
    changedCount: int = 0
    stagedCount: int = 0
    unstagedCount: int = 0
    untrackedCount: int = 0
    aheadCount: int = 0
    behindCount: int = 0
    lastSyncedAt: Optional[str] = None


class WorkspaceGitWorktreeList(BaseModel):
    worktrees: List[WorkspaceGitWorktree] = Field(default_factory=list)
    syncedAt: Optional[str] = None


class WorkspaceFileNode(BaseModel):
    path: str
    name: str
    type: str
    size: int = 0
    changedOn: Optional[str] = None
    gitStatus: Optional[str] = None


class WorkspaceFileList(BaseModel):
    workspace: WorkspaceConfig
    files: List[WorkspaceFileNode] = Field(default_factory=list)


class WorkspaceScript(BaseModel):
    path: str
    name: str
    size: int
    changedOn: str
    gitStatus: Optional[str] = None


class WorkspaceScriptList(BaseModel):
    workspace: WorkspaceConfig
    scripts: List[WorkspaceScript]
    gitStatus: List[str] = Field(default_factory=list)


class WorkspaceScriptContent(BaseModel):
    path: str
    content: str


class WorkspaceScriptSave(BaseModel):
    path: str = Field(min_length=1)
    content: str
