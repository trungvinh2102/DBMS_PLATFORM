/**
 * @file workspace-panel-types.ts
 * @description Shared TypeScript types for SQL Lab workspace Git panels.
 */

import type { ReactNode } from "react";

export type GitChange = {
  path: string;
  status: string;
  staged?: boolean;
  worktreeStatus?: string;
  isLive?: boolean;
};

export type GitWorktree = {
  path: string;
  branch?: string | null;
  isCurrent?: boolean;
  changedCount?: number;
};

export type GitBranch = {
  name: string;
  isCurrent?: boolean;
  isRemote?: boolean;
  upstream?: string | null;
};

export type WorkspaceFile = {
  path: string;
  name: string;
  type: "folder" | "file";
  size?: number;
  changedOn?: string;
  gitStatus?: string | null;
};

export type GitCommit = {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  relativeDate: string;
  refs?: string | null;
  parents?: string[];
};

export type GitCommitFile = {
  path: string;
  oldPath?: string | null;
  status: string;
  additions: number;
  deletions: number;
};

export type GitHistory = {
  commits?: GitCommit[];
  graph?: string;
};

export type GitCommitDetail = GitCommit & {
  files: GitCommitFile[];
};

export type GitStatus = {
  isRepository?: boolean;
  isClean?: boolean;
  changedCount?: number;
  stagedCount?: number;
  unstagedCount?: number;
  aheadCount?: number;
  behindCount?: number;
  branch?: string | null;
  upstream?: string | null;
  changes?: GitChange[];
  lastCommit?: string | null;
};

export type ChangeSummary = {
  added: number;
  modified: number;
  deleted: number;
  untracked: number;
};

export type IconNode = ReactNode;
