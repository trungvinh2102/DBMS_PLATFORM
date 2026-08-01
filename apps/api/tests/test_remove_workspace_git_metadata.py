"""Tests for removal of QurioDB's internal SQLLab Git workspace metadata."""

import json

from sqlalchemy import create_engine

from services.startup import migrate_remove_workspace_git_metadata


def make_engine():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE user_settings (
                id VARCHAR NOT NULL PRIMARY KEY,
                "userId" VARCHAR NOT NULL UNIQUE,
                settings JSON
            )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE workspace_git_worktrees (
                id VARCHAR NOT NULL PRIMARY KEY,
                "userId" VARCHAR NOT NULL,
                "repoRoot" VARCHAR NOT NULL,
                path VARCHAR NOT NULL
            )
            """
        )
    return engine


def insert_settings(engine, setting_id, user_id, value):
    with engine.begin() as connection:
        connection.exec_driver_sql(
            'INSERT INTO user_settings (id, "userId", settings) VALUES (?, ?, ?)',
            (setting_id, user_id, value),
        )


def fetch_settings(engine, setting_id):
    with engine.begin() as connection:
        row = connection.exec_driver_sql(
            "SELECT settings FROM user_settings WHERE id = ?", (setting_id,)
        ).fetchone()
    return row[0]


def table_exists(engine, name):
    with engine.begin() as connection:
        row = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (name,),
        ).fetchone()
    return row is not None


def test_migration_drops_workspace_git_worktrees_table():
    engine = make_engine()

    migrate_remove_workspace_git_metadata(engine)

    assert table_exists(engine, "workspace_git_worktrees") is False


def test_migration_removes_only_obsolete_object_keys():
    engine = make_engine()
    insert_settings(
        engine,
        "setting-1",
        "user-1",
        json.dumps(
            {
                "workspace": {"rootPath": "/home/user/repository"},
                "sqllabGitDirectoryEnabled": True,
                "theme": "dark",
                "defaultQueryLimit": 500,
            }
        ),
    )

    migrate_remove_workspace_git_metadata(engine)

    assert json.loads(fetch_settings(engine, "setting-1")) == {
        "theme": "dark",
        "defaultQueryLimit": 500,
    }


def test_migration_preserves_unexpected_settings_values():
    engine = make_engine()
    insert_settings(engine, "setting-null", "user-null", None)
    insert_settings(engine, "setting-list", "user-list", json.dumps(["dark", 500]))
    insert_settings(engine, "setting-string", "user-string", json.dumps("dark"))
    insert_settings(engine, "setting-bad", "user-bad", "{not-json")

    migrate_remove_workspace_git_metadata(engine)

    assert fetch_settings(engine, "setting-null") is None
    assert json.loads(fetch_settings(engine, "setting-list")) == ["dark", 500]
    assert json.loads(fetch_settings(engine, "setting-string")) == "dark"
    assert fetch_settings(engine, "setting-bad") == "{not-json"


def test_migration_is_idempotent():
    engine = make_engine()
    insert_settings(
        engine,
        "setting-1",
        "user-1",
        json.dumps(
            {
                "workspace": {"rootPath": "/repository"},
                "sqllabGitDirectoryEnabled": True,
                "theme": "dark",
            }
        ),
    )

    migrate_remove_workspace_git_metadata(engine)
    first_result = fetch_settings(engine, "setting-1")
    migrate_remove_workspace_git_metadata(engine)
    second_result = fetch_settings(engine, "setting-1")

    assert json.loads(first_result) == {"theme": "dark"}
    assert second_result == first_result
    assert table_exists(engine, "workspace_git_worktrees") is False


def test_create_all_does_not_recreate_workspace_git_worktrees():
    from models import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    assert table_exists(engine, "workspace_git_worktrees") is False
