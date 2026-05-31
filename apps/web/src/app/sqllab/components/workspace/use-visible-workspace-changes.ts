/**
 * @file use-visible-workspace-changes.ts
 * @description Derives SQL Lab workspace Git changes including the active unsaved editor diff.
 */

import { useMemo } from "react";
import { useSQLLabContext } from "../../context/SQLLabContext";
import { buildUnifiedDiff } from "../../utils/unified-diff";
import { toGitPath } from "./workspace-git-utils";
import type { GitChange } from "./workspace-panel-types";

export function useVisibleWorkspaceChanges({
  changes,
  scriptsRootLabel,
}: {
  changes: GitChange[];
  scriptsRootLabel: string;
}) {
  const lab = useSQLLabContext();
  const activeTab = lab.tabs.find((tab: any) => tab.id === lab.activeTabId);
  const activeGitPath = toGitPath(activeTab?.scriptPath, scriptsRootLabel);
  const activeScriptDiff = useMemo(() => {
    if (!activeGitPath || activeTab?.workspaceBaseSql === undefined || activeTab?.sql === undefined) return "";
    return buildUnifiedDiff(activeTab.workspaceBaseSql, activeTab.sql, activeGitPath);
  }, [activeGitPath, activeTab?.workspaceBaseSql, activeTab?.sql]);

  return useMemo(() => {
    const hasTrackedActivePath = changes.some((change) => change.path === activeGitPath);
    if (!activeGitPath || !activeScriptDiff || hasTrackedActivePath) return changes;
    return [{ path: activeGitPath, status: "modified", staged: false, worktreeStatus: "M", isLive: true }, ...changes];
  }, [activeGitPath, activeScriptDiff, changes]);
}
