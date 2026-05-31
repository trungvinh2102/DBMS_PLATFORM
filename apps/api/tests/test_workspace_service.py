"""
test_workspace_service.py

Regression tests for local SQL script workspace path safety and persistence.
"""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, UserSetting, WorkspaceGitWorktree
import services.workspace_service as workspace_module
from services.workspace_service import WorkspaceService


def make_workspace_service(tmp_path, monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    monkeypatch.setattr(workspace_module, "SessionLocal", session_factory)

    service = WorkspaceService()
    monkeypatch.setattr(service, "_default_root", lambda: tmp_path / "workspace")
    return service, session_factory


def init_git_repo(service, root):
    root.mkdir(parents=True, exist_ok=True)
    service._run_git(root, ["init"])
    return root


def test_workspace_creates_default_sql_folder_and_saves_script(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)

    saved = service.save_script("user-1", "reports/daily.sql", "SELECT 1;")
    listed = service.list_scripts("user-1")

    assert saved["path"] == "reports/daily.sql"
    assert listed["workspace"]["scriptsPath"].replace("\\", "/").endswith("workspace/sql")
    assert listed["workspace"]["gitEnabled"] is False
    assert listed["scripts"][0]["path"] == "reports/daily.sql"
    assert service.read_script("user-1", "reports/daily.sql")["content"] == "SELECT 1;"


def test_workspace_does_not_initialize_git_by_default(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)

    config = service.get_config("user-1")

    assert config["gitEnabled"] is False
    assert not (tmp_path / "workspace" / ".git").exists()


def test_workspace_rejects_paths_outside_scripts_folder(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)

    try:
        service.save_script("user-1", "../escape.sql", "SELECT 1;")
    except ValueError as exc:
        assert "inside the workspace" in str(exc)
    else:
        raise AssertionError("Expected path traversal to be rejected")


def test_workspace_update_persists_custom_root(tmp_path, monkeypatch):
    service, session_factory = make_workspace_service(tmp_path, monkeypatch)
    custom_root = init_git_repo(service, tmp_path / "custom-workspace")

    config = service.update_config("user-1", {"name": "Team SQL", "rootPath": str(custom_root)})

    assert config["name"] == "custom-workspace"
    assert config["scriptsPath"].replace("\\", "/").endswith("custom-workspace/sql")
    session = session_factory()
    try:
        setting = session.query(UserSetting).filter(UserSetting.userId == "user-1").first()
        assert setting.settings["workspace"]["name"] == "custom-workspace"
    finally:
        session.close()


def test_workspace_update_rejects_non_git_root(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    custom_root = tmp_path / "plain-folder"

    try:
        service.update_config("user-1", {"rootPath": str(custom_root)})
    except ValueError as exc:
        assert "existing Git" in str(exc)
    else:
        raise AssertionError("Expected non-Git root to be rejected")
    assert not custom_root.exists()


def test_workspace_pick_folder_returns_selected_path(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    selected = tmp_path / "chosen"
    selected.mkdir()
    monkeypatch.setattr(service, "_pick_folder_with_tkinter", lambda _initial_path: str(selected))

    result = service.pick_folder(str(tmp_path))

    assert result == {"path": str(selected)}


def test_workspace_git_status_reports_changed_sql_file(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service.save_script("user-1", "reports/active_customers.sql", "SELECT 1;")

    status = service.get_git_status("user-1")

    assert status["isRepository"] is True
    assert status["isClean"] is False
    assert status["changedCount"] == 1
    assert status["untrackedCount"] == 1
    assert status["changes"][0]["path"] == "sql/reports/active_customers.sql"
    assert status["changes"][0]["status"] == "untracked"


def test_workspace_git_status_hides_no_commit_fatal_output(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service.save_script("user-1", "reports/active_customers.sql", "SELECT 1;")

    status = service.get_git_status("user-1")
    history = service.get_git_history("user-1")

    assert status["upstream"] is None
    assert status["lastCommit"] is None
    assert "fatal:" not in history["graph"].lower()


def test_workspace_git_diff_rejects_paths_outside_workspace(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})

    try:
        service.get_git_diff("user-1", "../outside.sql")
    except ValueError as exc:
        assert "inside the workspace" in str(exc)
    else:
        raise AssertionError("Expected path traversal to be rejected")


def test_workspace_git_diff_formats_untracked_file_like_unified_diff(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service.save_script("user-1", "reports/revenue.sql", "SELECT 1;\nSELECT 2;")

    diff = service.get_git_diff("user-1", "sql/reports/revenue.sql")

    assert diff["diff"].startswith("--- a/sql/reports/revenue.sql")
    assert "+++ b/sql/reports/revenue.sql" in diff["diff"]
    assert "@@ -0,0 +1,2 @@" in diff["diff"]
    assert "+SELECT 2;" in diff["diff"]


def test_workspace_lists_full_file_tree_for_selected_worktree(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "scriptsFolder": "queries"})
    (root / "docs").mkdir()
    (root / "docs" / "notes.md").write_text("# Notes", encoding="utf-8")
    service.save_script("user-1", "reports/revenue.sql", "SELECT 1;")

    result = service.list_files("user-1")
    paths = {item["path"] for item in result["files"]}

    assert "docs" in paths
    assert "docs/notes.md" in paths
    assert "queries/reports/revenue.sql" in paths


def test_workspace_stage_commit_and_history_graph(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service._run_git(root, ["config", "user.email", "quriodb@example.local"])
    service._run_git(root, ["config", "user.name", "QurioDB Test"])
    service.save_script("user-1", "reports/revenue.sql", "SELECT 1;")

    staged = service.stage_git_paths("user-1", ["sql/reports/revenue.sql"])
    committed = service.commit_git_paths("user-1", "Add revenue query", [])
    history = service.get_git_history("user-1")

    assert staged["ok"] is True
    assert committed["ok"] is True
    assert history["commits"][0]["subject"] == "Add revenue query"
    assert "Add revenue query" in history["graph"]


def test_workspace_pull_integrates_remote_changes_before_push(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    remote = tmp_path / "remote.git"
    service._run_git(tmp_path, ["init", "--bare", str(remote)])
    root = init_git_repo(service, tmp_path / "workspace")
    service._run_git(root, ["config", "user.email", "quriodb@example.local"])
    service._run_git(root, ["config", "user.name", "QurioDB Test"])
    service._run_git(root, ["remote", "add", "origin", str(remote)])
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service.save_script("user-1", "reports/base.sql", "SELECT 1;")
    service.stage_git_paths("user-1", ["sql/reports/base.sql"])
    service.commit_git_paths("user-1", "Add base query", [])
    service.push_git("user-1")

    other_root = tmp_path / "other-workspace"
    service._run_git(tmp_path, ["clone", str(remote), str(other_root)])
    service._run_git(other_root, ["config", "user.email", "other@example.local"])
    service._run_git(other_root, ["config", "user.name", "Other User"])
    (other_root / "sql" / "reports" / "remote.sql").write_text("SELECT 2;", encoding="utf-8")
    service._run_git(other_root, ["add", "sql/reports/remote.sql"])
    service._run_git(other_root, ["commit", "-m", "Add remote query"])
    service._run_git(other_root, ["push"])
    service.save_script("user-1", "reports/local.sql", "SELECT 3;")
    service.stage_git_paths("user-1", ["sql/reports/local.sql"])
    service.commit_git_paths("user-1", "Add local query", [])

    try:
        service.push_git("user-1")
    except ValueError as exc:
        assert "Pull remote changes" in str(exc)
    else:
        raise AssertionError("Expected push to be rejected until remote changes are pulled")

    pulled = service.pull_git("user-1")
    pushed = service.push_git("user-1")

    assert pulled["ok"] is True
    assert pushed["ok"] is True
    assert (root / "sql" / "reports" / "remote.sql").read_text(encoding="utf-8") == "SELECT 2;"


def test_workspace_worktree_list_syncs_metadata_rows(tmp_path, monkeypatch):
    service, session_factory = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service._run_git(root, ["config", "user.email", "quriodb@example.local"])
    service._run_git(root, ["config", "user.name", "QurioDB Test"])
    service.save_script("user-1", "reports/revenue.sql", "SELECT 1;")
    service.stage_git_paths("user-1", ["sql/reports/revenue.sql"])
    service.commit_git_paths("user-1", "Add revenue query", [])
    default_branch = service._git_branch(root)

    feature_root = tmp_path / "workspace-feature"
    output = service._run_git(root, ["worktree", "add", "-b", "feature/worktree-sync", str(feature_root)], check=False)
    listed = service.list_git_worktrees("user-1")

    assert "fatal:" not in output.lower()
    assert {item["branch"] for item in listed["worktrees"]} >= {default_branch, "feature/worktree-sync"}
    session = session_factory()
    try:
        rows = session.query(WorkspaceGitWorktree).filter(WorkspaceGitWorktree.userId == "user-1").all()
        assert len(rows) == 2
        assert {row.branch for row in rows} >= {default_branch, "feature/worktree-sync"}
        assert all(row.repoRoot for row in rows)
    finally:
        session.close()


def test_workspace_activate_worktree_updates_config_root(tmp_path, monkeypatch):
    service, _ = make_workspace_service(tmp_path, monkeypatch)
    root = init_git_repo(service, tmp_path / "workspace")
    feature_root = tmp_path / "workspace-feature"
    service.update_config("user-1", {"rootPath": str(root), "initializeGit": True})
    service._run_git(root, ["config", "user.email", "quriodb@example.local"])
    service._run_git(root, ["config", "user.name", "QurioDB Test"])
    service.save_script("user-1", "reports/revenue.sql", "SELECT 1;")
    service.stage_git_paths("user-1", ["sql/reports/revenue.sql"])
    service.commit_git_paths("user-1", "Add revenue query", [])
    service._run_git(root, ["worktree", "add", "-b", "feature/use-worktree", str(feature_root)], check=False)

    config = service.activate_git_worktree("user-1", str(feature_root))

    assert config["rootPath"] == str(feature_root)
    listed = service.list_git_worktrees("user-1")
    active = [item for item in listed["worktrees"] if item["isCurrent"]]
    assert Path(active[0]["path"]).resolve() == feature_root.resolve()
