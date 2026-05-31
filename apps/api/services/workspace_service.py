"""
workspace_service.py

Local workspace service for storing SQL scripts on disk and exposing Git status.
"""

from __future__ import annotations

import subprocess
import uuid
from datetime import datetime, timezone
from difflib import unified_diff
from pathlib import Path
from typing import Any, Dict, List, Optional

from models import SessionLocal, UserSetting, WorkspaceGitWorktree


DEFAULT_WORKSPACE_NAME = "Local Workspace"
DEFAULT_SCRIPTS_FOLDER = "sql"


class WorkspaceService:
    """Manage a desktop-safe local SQL scripts workspace."""

    def get_config(self, user_id: str) -> Dict[str, Any]:
        settings = self._get_settings(user_id)
        workspace = settings.get("workspace") or {}
        root = Path(workspace.get("rootPath") or self._default_root()).expanduser().resolve()
        scripts_folder = workspace.get("scriptsFolder") or DEFAULT_SCRIPTS_FOLDER
        scripts_path = self._scripts_path(root, scripts_folder)
        scripts_path.mkdir(parents=True, exist_ok=True)
        git_enabled = self._is_git_repository(root)

        return {
            "name": self._git_project_name(root) if git_enabled else workspace.get("name") or DEFAULT_WORKSPACE_NAME,
            "rootPath": str(root),
            "scriptsPath": str(scripts_path),
            "gitEnabled": git_enabled,
        }

    def update_config(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        settings = self._get_settings(user_id)
        current = settings.get("workspace") or {}

        root = Path(data.get("rootPath") or current.get("rootPath") or self._default_root()).expanduser().resolve()
        scripts_folder = data.get("scriptsFolder") or current.get("scriptsFolder") or DEFAULT_SCRIPTS_FOLDER

        if data.get("rootPath") and not root.exists():
            raise ValueError("Choose an existing Git repository or Git worktree folder")
        if data.get("rootPath") and not self._is_git_repository(root):
            raise ValueError("Choose an existing Git repository or Git worktree folder")

        root.mkdir(parents=True, exist_ok=True)
        self._scripts_path(root, scripts_folder).mkdir(parents=True, exist_ok=True)

        settings["workspace"] = {
            "name": self._git_project_name(root) if self._is_git_repository(root) else DEFAULT_WORKSPACE_NAME,
            "rootPath": str(root),
            "scriptsFolder": scripts_folder,
        }
        self._save_settings(user_id, settings)
        return self.get_config(user_id)

    def list_scripts(self, user_id: str) -> Dict[str, Any]:
        config = self.get_config(user_id)
        root = Path(config["rootPath"])
        scripts_path = Path(config["scriptsPath"])
        status_by_path = self._git_status_by_path(root)

        scripts = []
        for path in sorted(scripts_path.rglob("*.sql"), key=lambda item: str(item).lower()):
            relative_path = path.relative_to(scripts_path).as_posix()
            stat = path.stat()
            scripts.append(
                {
                    "path": relative_path,
                    "name": path.name,
                    "size": stat.st_size,
                    "changedOn": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                    "gitStatus": status_by_path.get(self._git_relative_path(root, path)),
                }
            )

        return {
            "workspace": config,
            "scripts": scripts,
            "gitStatus": self._git_status_lines(root),
        }

    def get_git_status(self, user_id: str) -> Dict[str, Any]:
        """Return structured Git status for the configured workspace root."""
        config = self.get_config(user_id)
        root = Path(config["rootPath"])
        if not self._is_git_repository(root):
            return {
                "isRepository": False,
                "branch": None,
                "upstream": None,
                "isClean": True,
                "changedCount": 0,
                "stagedCount": 0,
                "unstagedCount": 0,
                "untrackedCount": 0,
                "aheadCount": 0,
                "behindCount": 0,
                "changes": [],
                "lastCommit": None,
            }

        changes = self._git_changes(root)
        ahead_count, behind_count = self._git_ahead_behind(root)
        return {
            "isRepository": True,
            "branch": self._git_branch(root),
            "upstream": self._git_upstream(root),
            "isClean": len(changes) == 0,
            "changedCount": len(changes),
            "stagedCount": sum(1 for item in changes if item["staged"]),
            "unstagedCount": sum(1 for item in changes if item["worktreeStatus"]),
            "untrackedCount": sum(1 for item in changes if item["status"] == "untracked"),
            "aheadCount": ahead_count,
            "behindCount": behind_count,
            "changes": changes,
            "lastCommit": self._git_last_commit(root),
        }

    def get_git_diff(self, user_id: str, relative_path: str) -> Dict[str, Any]:
        """Return a unified diff for a file inside the workspace root."""
        config = self.get_config(user_id)
        root = Path(config["rootPath"]).resolve()
        if not self._is_git_repository(root):
            raise ValueError("Workspace root is not a Git repository")

        safe_path = self._resolve_workspace_path(root, relative_path)
        git_path = safe_path.relative_to(root).as_posix()
        diff = self._run_git(root, ["diff", "--", git_path], check=False)
        if not diff:
            diff = self._run_git(root, ["diff", "--cached", "--", git_path], check=False)
        if not diff:
            content = safe_path.read_text(encoding="utf-8") if safe_path.exists() else ""
            diff = "\n".join(
                unified_diff(
                    [],
                    content.splitlines(),
                    fromfile=f"a/{git_path}",
                    tofile=f"b/{git_path}",
                    lineterm="",
                )
            )

        return {"path": git_path, "diff": diff, "isBinary": "Binary files" in diff}

    def list_files(self, user_id: str) -> Dict[str, Any]:
        """Return a bounded full workspace file tree for the selected root."""
        config = self.get_config(user_id)
        root = Path(config["rootPath"]).resolve()
        status_by_path = self._git_status_by_path(root)
        files = []

        for path in sorted(root.rglob("*"), key=lambda item: (item.is_file(), str(item).lower())):
            relative_path = path.relative_to(root).as_posix()
            if self._should_skip_workspace_path(relative_path):
                continue
            stat = path.stat()
            files.append(
                {
                    "path": relative_path,
                    "name": path.name,
                    "type": "folder" if path.is_dir() else "file",
                    "size": 0 if path.is_dir() else stat.st_size,
                    "changedOn": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                    "gitStatus": status_by_path.get(relative_path),
                }
            )
            if len(files) >= 2000:
                break

        return {"workspace": config, "files": files}

    def list_git_worktrees(self, user_id: str) -> Dict[str, Any]:
        """Return Git worktrees attached to the selected repository."""
        config = self.get_config(user_id)
        root = Path(config["rootPath"]).resolve()
        if not self._is_git_repository(root):
            return {"worktrees": [], "syncedAt": None}

        result = self._run_git(root, ["worktree", "list", "--porcelain"], check=False)
        worktrees = self._parse_worktrees(result, root)
        synced_at = datetime.now(timezone.utc)
        repo_root = self._git_repo_root(root)
        self._sync_worktree_rows(user_id, repo_root, worktrees, synced_at)
        return {"worktrees": worktrees, "syncedAt": synced_at.isoformat()}

    def remove_git_worktree(self, user_id: str, path: str, force: bool = False) -> Dict[str, Any]:
        """Remove a Git worktree and clear its cached metadata."""
        config = self.get_config(user_id)
        root = Path(config["rootPath"]).resolve()
        if not self._is_git_repository(root):
            raise ValueError("Workspace root is not a Git repository")

        target_path = Path(path).expanduser().resolve()
        if target_path == root:
            raise ValueError("Cannot remove the active worktree")
        args = ["worktree", "remove"]
        if force:
            args.append("--force")
        args.append(str(target_path))

        output = self._run_git(root, args, check=False).strip()
        if self._is_git_failure_output(output):
            raise RuntimeError(output)

        self._delete_worktree_row(user_id, str(target_path))
        self.list_git_worktrees(user_id)
        return {"ok": True, "message": output or f"Removed worktree {target_path}"}

    def activate_git_worktree(self, user_id: str, path: str) -> Dict[str, Any]:
        """Make an existing worktree the active SQL project root."""
        target_path = Path(path).expanduser().resolve()
        if not target_path.exists() or not self._is_git_repository(target_path):
            raise ValueError("Selected path is not a Git worktree")

        self._set_workspace_root(user_id, target_path)
        self.list_git_worktrees(user_id)
        return self.get_config(user_id)

    def get_git_history(self, user_id: str, limit: int = 50) -> Dict[str, Any]:
        """Return recent commits plus a compact text graph."""
        config = self.get_config(user_id)
        root = Path(config["rootPath"]).resolve()
        if not self._is_git_repository(root):
            return {"commits": [], "graph": ""}

        safe_limit = max(1, min(limit, 100))
        graph = self._run_git(
            root,
            ["log", f"-{safe_limit}", "--graph", "--decorate", "--oneline", "--all"],
            check=False,
        )
        raw_commits = self._run_git(
            root,
            [
                "log",
                f"-{safe_limit}",
                "--all",
                "--pretty=format:%H%x1f%h%x1f%P%x1f%an%x1f%ar%x1f%s%x1f%D%x1e",
            ],
            check=False,
        )
        if self._is_git_failure_output(graph):
            graph = ""
        if self._is_git_failure_output(raw_commits):
            raw_commits = ""
        commits = []
        for entry in [item for item in raw_commits.split("\x1e") if item.strip()]:
            parts = entry.strip().split("\x1f")
            if len(parts) < 7:
                continue
            commits.append(
                {
                    "hash": parts[0],
                    "shortHash": parts[1],
                    "parents": [parent for parent in parts[2].split(" ") if parent],
                    "author": parts[3],
                    "relativeDate": parts[4],
                    "subject": parts[5],
                    "refs": parts[6] or None,
                }
            )

        return {"commits": commits, "graph": graph}

    def stage_git_paths(self, user_id: str, paths: List[str]) -> Dict[str, Any]:
        root, git_paths = self._validated_git_paths(user_id, paths)
        if not git_paths:
            raise ValueError("Choose at least one file to stage")
        self._run_git(root, ["add", "--", *git_paths])
        return {"ok": True, "message": f"Staged {len(git_paths)} file(s)"}

    def unstage_git_paths(self, user_id: str, paths: List[str]) -> Dict[str, Any]:
        root, git_paths = self._validated_git_paths(user_id, paths)
        if not git_paths:
            raise ValueError("Choose at least one file to unstage")
        self._run_git(root, ["restore", "--staged", "--", *git_paths])
        return {"ok": True, "message": f"Unstaged {len(git_paths)} file(s)"}

    def commit_git_paths(self, user_id: str, message: str, paths: List[str]) -> Dict[str, Any]:
        root = Path(self.get_config(user_id)["rootPath"]).resolve()
        if not self._is_git_repository(root):
            raise ValueError("Workspace root is not a Git repository")
        if paths:
            self.stage_git_paths(user_id, paths)
        output = self._run_git(root, ["commit", "-m", message.strip()], check=False).strip()
        lowered = output.lower()
        if "nothing to commit" in lowered or "no changes added" in lowered:
            raise ValueError("No staged changes to commit")
        if "fatal:" in lowered or "error:" in lowered:
            raise RuntimeError(output)
        return {"ok": True, "message": output or "Committed changes"}

    def push_git(self, user_id: str) -> Dict[str, Any]:
        root = Path(self.get_config(user_id)["rootPath"]).resolve()
        if not self._is_git_repository(root):
            raise ValueError("Workspace root is not a Git repository")
        upstream = self._git_upstream(root)
        args = ["push"] if upstream else ["push", "-u", "origin", self._git_branch(root) or "HEAD"]
        output = self._run_git(root, args, check=False).strip()
        if self._is_non_fast_forward_push(output):
            raise ValueError("Remote has new commits. Pull remote changes before pushing again.")
        if "fatal:" in output.lower() or "error:" in output.lower():
            raise RuntimeError(output)
        return {"ok": True, "message": output or "Pushed current branch"}

    def pull_git(self, user_id: str) -> Dict[str, Any]:
        root = Path(self.get_config(user_id)["rootPath"]).resolve()
        if not self._is_git_repository(root):
            raise ValueError("Workspace root is not a Git repository")

        upstream = self._git_upstream(root)
        branch = self._git_branch(root)
        if not upstream and not branch:
            raise ValueError("Cannot pull while the workspace is detached from a branch")

        args = ["pull", "--rebase", "--autostash"] if upstream else ["pull", "--rebase", "--autostash", "origin", branch]
        output = self._run_git(root, args, check=False).strip()
        lowered = output.lower()
        if "conflict" in lowered or "could not apply" in lowered or "automatic merge failed" in lowered:
            raise RuntimeError("Pull stopped because Git found conflicts. Resolve the conflicts, then continue or abort the rebase.")
        if "fatal:" in lowered or "error:" in lowered:
            raise RuntimeError(output)
        return {"ok": True, "message": output or "Pulled remote changes"}

    def read_script(self, user_id: str, relative_path: str) -> Dict[str, str]:
        path = self._resolve_script_path(user_id, relative_path)
        if not path.exists():
            raise FileNotFoundError("SQL script not found")

        return {"path": relative_path, "content": path.read_text(encoding="utf-8")}

    def save_script(self, user_id: str, relative_path: str, content: str) -> Dict[str, str]:
        path = self._resolve_script_path(user_id, relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
        return {"path": path.relative_to(Path(self.get_config(user_id)["scriptsPath"])).as_posix(), "content": content}

    def pick_folder(self, initial_path: Optional[str] = None) -> Dict[str, Optional[str]]:
        """Open a native folder picker from the local backend process."""
        selected_path = self._pick_folder_with_tkinter(initial_path)
        return {"path": selected_path}

    def _resolve_script_path(self, user_id: str, relative_path: str) -> Path:
        config = self.get_config(user_id)
        scripts_path = Path(config["scriptsPath"]).resolve()
        clean_path = relative_path.replace("\\", "/").strip().lstrip("/")
        if not clean_path.endswith(".sql"):
            clean_path = f"{clean_path}.sql"

        candidate = (scripts_path / clean_path).resolve()
        if not candidate.is_relative_to(scripts_path):
            raise ValueError("Script path must stay inside the workspace scripts folder")
        return candidate

    def _get_settings(self, user_id: str) -> Dict[str, Any]:
        session = SessionLocal()
        try:
            setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
            return dict(setting.settings or {}) if setting else {}
        finally:
            if session:
                session.close()

    def _save_settings(self, user_id: str, settings: Dict[str, Any]) -> None:
        session = SessionLocal()
        try:
            setting = session.query(UserSetting).filter(UserSetting.userId == user_id).first()
            if setting:
                setting.settings = settings
            else:
                session.add(UserSetting(id=str(uuid.uuid4()), userId=user_id, settings=settings))
            session.commit()
        finally:
            if session:
                session.close()

    def _set_workspace_root(self, user_id: str, root: Path) -> None:
        settings = self._get_settings(user_id)
        workspace = settings.get("workspace") or {}
        workspace["rootPath"] = str(root)
        workspace["name"] = self._git_project_name(root)
        workspace.setdefault("scriptsFolder", DEFAULT_SCRIPTS_FOLDER)
        settings["workspace"] = workspace
        self._save_settings(user_id, settings)

    def _default_root(self) -> Path:
        return Path.home() / ".quriodb" / "workspace"

    def _scripts_path(self, root: Path, scripts_folder: str) -> Path:
        scripts_path = (root / scripts_folder).resolve()
        if not scripts_path.is_relative_to(root):
            raise ValueError("Scripts folder must stay inside the workspace")
        return scripts_path

    def _git_status_lines(self, root: Path) -> List[str]:
        if not self._is_git_repository(root):
            return []
        result = self._run_git(root, ["status", "--short"], check=False)
        return [line for line in result.splitlines() if line.strip()]

    def _ensure_git_tracking(self, root: Path) -> bool:
        """Return whether the folder is already tracked by Git."""
        return self._is_git_repository(root)

    def _is_git_repository(self, root: Path) -> bool:
        if not root.exists():
            return False
        result = self._run_git(root, ["rev-parse", "--is-inside-work-tree"], check=False).strip()
        return result.splitlines()[0:1] == ["true"]

    def _git_changes(self, root: Path) -> List[Dict[str, Any]]:
        changes = []
        result = self._run_git(root, ["status", "--porcelain=v1", "-z", "-uall"], check=False)
        entries = [entry for entry in result.split("\0") if entry]
        for entry in entries:
            if len(entry) < 4:
                continue

            index_status = entry[0].strip() or None
            worktree_status = entry[1].strip() or None
            path = entry[3:].replace("\\", "/")
            status = self._describe_git_status(index_status, worktree_status)
            changes.append(
                {
                    "path": path,
                    "status": status,
                    "staged": bool(index_status and index_status != "?"),
                    "indexStatus": index_status,
                    "worktreeStatus": worktree_status,
                }
            )
        return changes

    def _describe_git_status(self, index_status: Optional[str], worktree_status: Optional[str]) -> str:
        if index_status == "?" and worktree_status == "?":
            return "untracked"
        if index_status == "A" or worktree_status == "A":
            return "added"
        if index_status == "D" or worktree_status == "D":
            return "deleted"
        if index_status == "R" or worktree_status == "R":
            return "renamed"
        if index_status == "U" or worktree_status == "U":
            return "conflict"
        return "modified"

    def _git_branch(self, root: Path) -> Optional[str]:
        branch = self._run_git(root, ["branch", "--show-current"], check=False).strip()
        if branch:
            return branch

        head = self._run_git(root, ["rev-parse", "--short", "HEAD"], check=False).strip()
        return head or None

    def _git_last_commit(self, root: Path) -> Optional[str]:
        commit = self._run_git(root, ["log", "-1", "--pretty=%h %s"], check=False).strip()
        if self._is_git_failure_output(commit):
            return None
        return commit or None

    def _git_upstream(self, root: Path) -> Optional[str]:
        upstream = self._run_git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], check=False).strip()
        if self._is_git_failure_output(upstream):
            return None
        return upstream or None

    def _git_ahead_behind(self, root: Path) -> tuple[int, int]:
        upstream = self._git_upstream(root)
        if not upstream:
            return 0, 0
        result = self._run_git(root, ["rev-list", "--left-right", "--count", f"HEAD...{upstream}"], check=False).strip()
        if self._is_git_failure_output(result):
            return 0, 0
        parts = result.split()
        if len(parts) != 2 or not all(part.isdigit() for part in parts):
            return 0, 0
        return int(parts[0]), int(parts[1])

    def _git_status_by_path(self, root: Path) -> Dict[str, str]:
        status = {}
        for line in self._git_status_lines(root):
            if len(line) < 4:
                continue
            status[line[3:].replace("\\", "/")] = line[:2].strip() or "clean"
        return status

    def _is_git_failure_output(self, output: str) -> bool:
        lowered = output.lower().strip()
        return lowered.startswith("fatal:") or lowered.startswith("error:")

    def _is_non_fast_forward_push(self, output: str) -> bool:
        lowered = output.lower()
        return "rejected" in lowered and ("fetch first" in lowered or "non-fast-forward" in lowered)

    def _git_relative_path(self, root: Path, path: Path) -> str:
        return path.resolve().relative_to(root.resolve()).as_posix()

    def _resolve_workspace_path(self, root: Path, relative_path: str) -> Path:
        clean_path = relative_path.replace("\\", "/").strip().lstrip("/")
        candidate = (root / clean_path).resolve()
        if not candidate.is_relative_to(root):
            raise ValueError("Path must stay inside the workspace root")
        return candidate

    def _validated_git_paths(self, user_id: str, paths: List[str]) -> tuple[Path, List[str]]:
        config = self.get_config(user_id)
        root = Path(config["rootPath"]).resolve()
        if not self._is_git_repository(root):
            raise ValueError("Workspace root is not a Git repository")
        git_paths = []
        for path in paths:
            safe_path = self._resolve_workspace_path(root, path)
            git_paths.append(safe_path.relative_to(root).as_posix())
        return root, git_paths

    def _should_skip_workspace_path(self, relative_path: str) -> bool:
        parts = relative_path.split("/")
        return any(part in {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"} for part in parts)

    def _parse_worktrees(self, raw_output: str, current_root: Path) -> List[Dict[str, Any]]:
        worktrees = []
        current: Dict[str, Any] = {}
        for line in raw_output.splitlines():
            if not line.strip():
                if current:
                    worktrees.append(current)
                    current = {}
                continue
            key, _, value = line.partition(" ")
            if key == "worktree":
                current["path"] = value
            elif key == "HEAD":
                current["head"] = value
            elif key == "branch":
                current["branch"] = value.removeprefix("refs/heads/")
            elif key == "bare":
                current["isBare"] = True
            elif key == "detached":
                current["isDetached"] = True
            elif key == "locked":
                current["isLocked"] = True
            elif key == "prunable":
                current["prunable"] = value or "true"
        if current:
            worktrees.append(current)

        for worktree in worktrees:
            worktree.setdefault("branch", None)
            worktree.setdefault("head", None)
            worktree.setdefault("isBare", False)
            worktree.setdefault("isDetached", False)
            worktree.setdefault("isLocked", False)
            worktree.setdefault("isMissing", False)
            worktree.setdefault("prunable", None)
            worktree["isCurrent"] = Path(worktree["path"]).resolve() == current_root
            worktree["name"] = Path(worktree["path"]).name
            worktree["repoRoot"] = self._git_repo_root(Path(worktree["path"]))
            self._attach_worktree_status(worktree)
        return worktrees

    def _attach_worktree_status(self, worktree: Dict[str, Any]) -> None:
        root = Path(worktree["path"]).resolve()
        if not root.exists():
            worktree["isMissing"] = True
            return

        changes = self._git_changes(root)
        ahead_count, behind_count = self._git_ahead_behind(root)
        worktree.update(
            {
                "changedCount": len(changes),
                "stagedCount": sum(1 for item in changes if item["staged"]),
                "unstagedCount": sum(1 for item in changes if item["worktreeStatus"]),
                "untrackedCount": sum(1 for item in changes if item["status"] == "untracked"),
                "aheadCount": ahead_count,
                "behindCount": behind_count,
            }
        )

    def _git_repo_root(self, root: Path) -> str:
        repo_root = self._run_git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"], check=False).strip()
        if self._is_git_failure_output(repo_root):
            return str(root.resolve())
        return str(Path(repo_root).resolve())

    def _git_project_name(self, root: Path) -> str:
        remote_url = self._run_git(root, ["config", "--get", "remote.origin.url"], check=False).strip()
        if remote_url and not self._is_git_failure_output(remote_url):
            normalized = remote_url.rstrip("/").removesuffix(".git")
            name = normalized.replace("\\", "/").split("/")[-1]
            if ":" in name:
                name = name.split(":")[-1]
            if name:
                return name

        top_level = self._run_git(root, ["rev-parse", "--show-toplevel"], check=False).strip()
        if top_level and not self._is_git_failure_output(top_level):
            return Path(top_level).name
        return root.name or DEFAULT_WORKSPACE_NAME

    def _sync_worktree_rows(
        self,
        user_id: str,
        repo_root: str,
        worktrees: List[Dict[str, Any]],
        synced_at: datetime,
    ) -> None:
        session = SessionLocal()
        if not session:
            return
        try:
            seen_paths = {str(Path(item["path"]).resolve()) for item in worktrees}
            existing = (
                session.query(WorkspaceGitWorktree)
                .filter(WorkspaceGitWorktree.userId == user_id, WorkspaceGitWorktree.repoRoot == repo_root)
                .all()
            )
            existing_by_path = {row.path: row for row in existing}

            for item in worktrees:
                path = str(Path(item["path"]).resolve())
                row = existing_by_path.get(path)
                if not row:
                    row = WorkspaceGitWorktree(id=str(uuid.uuid4()), userId=user_id, repoRoot=repo_root, path=path)
                    session.add(row)
                row.name = item.get("name")
                row.branch = item.get("branch")
                row.head = item.get("head")
                row.isCurrent = bool(item.get("isCurrent"))
                row.isBare = bool(item.get("isBare"))
                row.isDetached = bool(item.get("isDetached"))
                row.isLocked = bool(item.get("isLocked"))
                row.isMissing = bool(item.get("isMissing"))
                row.prunable = item.get("prunable")
                row.changedCount = int(item.get("changedCount") or 0)
                row.stagedCount = int(item.get("stagedCount") or 0)
                row.unstagedCount = int(item.get("unstagedCount") or 0)
                row.untrackedCount = int(item.get("untrackedCount") or 0)
                row.aheadCount = int(item.get("aheadCount") or 0)
                row.behindCount = int(item.get("behindCount") or 0)
                row.lastSyncedAt = synced_at.replace(tzinfo=None)

            for row in existing:
                if row.path not in seen_paths:
                    row.isMissing = True
                    row.isCurrent = False
                    row.lastSyncedAt = synced_at.replace(tzinfo=None)
            session.commit()
        finally:
            session.close()

    def _delete_worktree_row(self, user_id: str, path: str) -> None:
        session = SessionLocal()
        if not session:
            return
        try:
            session.query(WorkspaceGitWorktree).filter(
                WorkspaceGitWorktree.userId == user_id,
                WorkspaceGitWorktree.path == path,
            ).delete()
            session.commit()
        finally:
            session.close()

    def _run_git(self, root: Path, args: List[str], check: bool = True) -> str:
        try:
            completed = subprocess.run(
                ["git", "-c", "i18n.logOutputEncoding=utf-8", "-c", "core.quotepath=false", "-C", str(root), *args],
                capture_output=True,
                check=check,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=5,
            )
            return completed.stdout if check else f"{completed.stdout}{completed.stderr}"
        except FileNotFoundError as exc:
            raise RuntimeError("Git executable was not found on this machine") from exc

    def _pick_folder_with_tkinter(self, initial_path: Optional[str]) -> Optional[str]:
        try:
            import tkinter as tk
            from tkinter import filedialog
        except Exception as exc:
            raise RuntimeError("Native folder picker is not available in this Python environment") from exc

        initial_dir = Path(initial_path).expanduser() if initial_path else Path.home()
        if not initial_dir.exists():
            initial_dir = Path.home()

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        try:
            selected = filedialog.askdirectory(
                parent=root,
                initialdir=str(initial_dir),
                title="Choose QurioDB workspace folder",
                mustexist=False,
            )
            return str(Path(selected).resolve()) if selected else None
        finally:
            root.destroy()


workspace_service = WorkspaceService()
