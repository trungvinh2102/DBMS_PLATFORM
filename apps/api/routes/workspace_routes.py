"""
workspace_routes.py

API routes for local SQL script workspace and Git-aware folder operations.
"""

from fastapi import APIRouter, Depends

from schemas.workspace import (
    WorkspaceConfig,
    WorkspaceConfigUpdate,
    WorkspaceFileList,
    WorkspaceGitActionPaths,
    WorkspaceGitActionResponse,
    WorkspaceGitCommitRequest,
    WorkspaceFolderPickRequest,
    WorkspaceFolderPickResponse,
    WorkspaceGitDiff,
    WorkspaceGitHistory,
    WorkspaceGitStatus,
    WorkspaceGitWorktreeActivate,
    WorkspaceGitWorktreeList,
    WorkspaceGitWorktreeRemove,
    WorkspaceScriptContent,
    WorkspaceScriptList,
    WorkspaceScriptSave,
)
from services.workspace_service import workspace_service
from utils.auth_middleware import get_current_user
from utils.http_errors import raise_http_error

workspace_bp = APIRouter()


@workspace_bp.get("", response_model=WorkspaceConfig)
def get_workspace(current_user: dict = Depends(get_current_user)):
    """Return the current user's local SQL workspace configuration."""
    try:
        return workspace_service.get_config(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("", response_model=WorkspaceConfig)
def update_workspace(data: WorkspaceConfigUpdate, current_user: dict = Depends(get_current_user)):
    """Update the local workspace folder and optionally initialize Git."""
    try:
        return workspace_service.update_config(current_user["userId"], data.model_dump(exclude_none=True))
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/pick-folder", response_model=WorkspaceFolderPickResponse)
def pick_workspace_folder(data: WorkspaceFolderPickRequest):
    """Open a local native folder picker for browser-based local development."""
    try:
        return workspace_service.pick_folder(data.initialPath)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/git/status", response_model=WorkspaceGitStatus)
def get_workspace_git_status(current_user: dict = Depends(get_current_user)):
    """Return branch and changed-file status for the workspace Git repository."""
    try:
        return workspace_service.get_git_status(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/git/diff", response_model=WorkspaceGitDiff)
def get_workspace_git_diff(path: str, current_user: dict = Depends(get_current_user)):
    """Return a unified Git diff for one workspace file."""
    try:
        return workspace_service.get_git_diff(current_user["userId"], path)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/git/history", response_model=WorkspaceGitHistory)
def get_workspace_git_history(limit: int = 50, current_user: dict = Depends(get_current_user)):
    """Return recent commits and a compact commit graph for the workspace repository."""
    try:
        return workspace_service.get_git_history(current_user["userId"], limit=limit)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/git/worktrees", response_model=WorkspaceGitWorktreeList)
def get_workspace_git_worktrees(current_user: dict = Depends(get_current_user)):
    """Return worktrees attached to the selected workspace repository."""
    try:
        return workspace_service.list_git_worktrees(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/worktrees/activate", response_model=WorkspaceConfig)
def activate_workspace_git_worktree(data: WorkspaceGitWorktreeActivate, current_user: dict = Depends(get_current_user)):
    """Make an existing worktree the active SQL project root."""
    try:
        return workspace_service.activate_git_worktree(current_user["userId"], data.path)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/worktrees/remove", response_model=WorkspaceGitActionResponse)
def remove_workspace_git_worktree(data: WorkspaceGitWorktreeRemove, current_user: dict = Depends(get_current_user)):
    """Remove a non-active Git worktree."""
    try:
        return workspace_service.remove_git_worktree(current_user["userId"], data.path, force=data.force)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/stage", response_model=WorkspaceGitActionResponse)
def stage_workspace_git_paths(data: WorkspaceGitActionPaths, current_user: dict = Depends(get_current_user)):
    """Stage selected workspace paths."""
    try:
        return workspace_service.stage_git_paths(current_user["userId"], data.paths)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/unstage", response_model=WorkspaceGitActionResponse)
def unstage_workspace_git_paths(data: WorkspaceGitActionPaths, current_user: dict = Depends(get_current_user)):
    """Unstage selected workspace paths."""
    try:
        return workspace_service.unstage_git_paths(current_user["userId"], data.paths)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/commit", response_model=WorkspaceGitActionResponse)
def commit_workspace_git_paths(data: WorkspaceGitCommitRequest, current_user: dict = Depends(get_current_user)):
    """Commit selected or already staged workspace paths."""
    try:
        return workspace_service.commit_git_paths(current_user["userId"], data.message, data.paths)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/push", response_model=WorkspaceGitActionResponse)
def push_workspace_git(current_user: dict = Depends(get_current_user)):
    """Push the current workspace branch to its configured remote."""
    try:
        return workspace_service.push_git(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/git/pull", response_model=WorkspaceGitActionResponse)
def pull_workspace_git(current_user: dict = Depends(get_current_user)):
    """Pull remote changes into the current workspace branch."""
    try:
        return workspace_service.pull_git(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/files", response_model=WorkspaceFileList)
def list_workspace_files(current_user: dict = Depends(get_current_user)):
    """List folders and files under the configured workspace root."""
    try:
        return workspace_service.list_files(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/scripts", response_model=WorkspaceScriptList)
def list_workspace_scripts(current_user: dict = Depends(get_current_user)):
    """List SQL scripts under the configured workspace scripts folder."""
    try:
        return workspace_service.list_scripts(current_user["userId"])
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.get("/scripts/read", response_model=WorkspaceScriptContent)
def read_workspace_script(path: str, current_user: dict = Depends(get_current_user)):
    """Read one SQL script from the workspace by relative path."""
    try:
        return workspace_service.read_script(current_user["userId"], path)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)


@workspace_bp.post("/scripts", response_model=WorkspaceScriptContent)
def save_workspace_script(data: WorkspaceScriptSave, current_user: dict = Depends(get_current_user)):
    """Create or overwrite one SQL script inside the workspace scripts folder."""
    try:
        return workspace_service.save_script(current_user["userId"], data.path, data.content)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)
