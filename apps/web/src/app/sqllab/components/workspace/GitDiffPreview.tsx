/**
 * @file GitDiffPreview.tsx
 * @description Central SQL Lab editor preview for workspace Git diffs.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useSQLLabContext } from "../../context/SQLLabContext";
import { buildUnifiedDiff } from "../../utils/unified-diff";
import { getScriptsRootLabel, toGitPath } from "./workspace-git-utils";

export function GitDiffPreview() {
  const lab = useSQLLabContext();
  const path = lab.gitPreviewPath;
  const activeTab = lab.tabs.find((tab: any) => tab.id === lab.activeTabId);
  const scriptsRootLabel = getScriptsRootLabel(lab.workspaceScripts?.workspace);
  const activeGitPath = toGitPath(activeTab?.scriptPath, scriptsRootLabel);
  const activeScriptDiff = useMemo(() => {
    if (!activeGitPath || activeTab?.workspaceBaseSql === undefined || activeTab?.sql === undefined) return "";
    return buildUnifiedDiff(activeTab.workspaceBaseSql, activeTab.sql, activeGitPath);
  }, [activeGitPath, activeTab?.workspaceBaseSql, activeTab?.sql]);

  const diffQuery = useQuery({
    queryKey: ["workspaceGitDiff", path],
    queryFn: () => workspaceApi.getGitDiff(path || ""),
    enabled: Boolean(path) && path !== activeGitPath,
  });

  if (!path) return null;

  const diff = path === activeGitPath && activeScriptDiff ? activeScriptDiff : diffQuery.data?.diff;

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b bg-muted/5 px-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold">{path}</p>
          <p className="text-[10px] text-muted-foreground">Workspace diff preview</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => diffQuery.refetch()}
            disabled={diffQuery.isFetching || path === activeGitPath}
            aria-label="Refresh diff"
            title="Refresh diff"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", diffQuery.isFetching && "animate-spin")} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => lab.setGitPreviewPath(null)}
            aria-label="Close diff preview"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/10">
        <div className="min-w-max py-3 font-mono text-xs leading-relaxed">
          {renderDiff(diff || (diffQuery.isLoading ? "Loading diff..." : "No diff available."))}
        </div>
      </div>
    </div>
  );
}

function renderDiff(diff: string) {
  let oldLineNumber = 0;
  let newLineNumber = 0;

  return diff.split("\n").map((line, index) => {
    const isFileHeader = line.startsWith("--- ") || line.startsWith("+++ ");
    const isHunk = line.startsWith("@@");
    const isAddition = !isFileHeader && !isHunk && line.startsWith("+");
    const isDeletion = !isFileHeader && !isHunk && line.startsWith("-");
    const isContext = !isFileHeader && !isHunk && line.startsWith(" ");
    const marker = line.charAt(0) || " ";
    const content = isAddition || isDeletion || isContext ? line.slice(1) : line;
    let oldLineLabel = "";
    let newLineLabel = "";

    if (isHunk) {
      const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      oldLineNumber = match ? Number(match[1]) : oldLineNumber;
      newLineNumber = match ? Number(match[2]) : newLineNumber;
    } else if (isAddition) {
      newLineLabel = String(newLineNumber);
      newLineNumber += 1;
    } else if (isDeletion) {
      oldLineLabel = String(oldLineNumber);
      oldLineNumber += 1;
    } else if (isContext) {
      oldLineLabel = String(oldLineNumber);
      newLineLabel = String(newLineNumber);
      oldLineNumber += 1;
      newLineNumber += 1;
    }

    const color = isAddition
      ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200"
      : isDeletion
        ? "bg-rose-500/12 text-rose-800 dark:text-rose-200"
        : isHunk
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
          : isFileHeader
            ? "bg-muted/50 text-muted-foreground"
            : "text-muted-foreground";

    return (
      <div key={`${index}-${line.slice(0, 12)}`} className={cn("grid grid-cols-[4rem_4rem_2rem_minmax(36rem,1fr)] px-3", color)}>
        <span className="select-none border-r border-border/40 pr-3 text-right text-muted-foreground/70">{oldLineLabel}</span>
        <span className="select-none border-r border-border/40 pr-3 text-right text-muted-foreground/70">{newLineLabel}</span>
        <span className="select-none border-r border-border/40 text-center text-muted-foreground/80">{isAddition || isDeletion ? marker : ""}</span>
        <span className="whitespace-pre pl-3">{content || " "}</span>
      </div>
    );
  });
}
