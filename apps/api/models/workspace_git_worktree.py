"""
workspace_git_worktree.py

SQLAlchemy model for cached Git worktree metadata in QurioDB's local system
database.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint

from .base import Base


class WorkspaceGitWorktree(Base):
    __tablename__ = "workspace_git_worktrees"
    __table_args__ = (
        UniqueConstraint("userId", "repoRoot", "path", name="uq_workspace_git_worktrees_user_repo_path"),
    )

    id = Column(String, primary_key=True)
    userId = Column(String, nullable=False, index=True)
    repoRoot = Column(String, nullable=False, index=True)
    path = Column(String, nullable=False)
    name = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    head = Column(String, nullable=True)
    isCurrent = Column(Boolean, default=False, nullable=False)
    isBare = Column(Boolean, default=False, nullable=False)
    isDetached = Column(Boolean, default=False, nullable=False)
    isLocked = Column(Boolean, default=False, nullable=False)
    isMissing = Column(Boolean, default=False, nullable=False)
    prunable = Column(String, nullable=True)
    changedCount = Column(Integer, default=0, nullable=False)
    stagedCount = Column(Integer, default=0, nullable=False)
    unstagedCount = Column(Integer, default=0, nullable=False)
    untrackedCount = Column(Integer, default=0, nullable=False)
    aheadCount = Column(Integer, default=0, nullable=False)
    behindCount = Column(Integer, default=0, nullable=False)
    lastSyncedAt = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
