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
  const commitHash = lab.gitPreviewCommitHash;
  const activeTab = lab.tabs.find((tab: any) => tab.id === lab.activeTabId);
  const scriptsRootLabel = getScriptsRootLabel(lab.workspaceScripts?.workspace);
  const activeGitPath = toGitPath(activeTab?.scriptPath, scriptsRootLabel);
  const activeScriptDiff = useMemo(() => {
    if (!activeGitPath || activeTab?.workspaceBaseSql === undefined || activeTab?.sql === undefined) return "";
    return buildUnifiedDiff(activeTab.workspaceBaseSql, activeTab.sql, activeGitPath);
  }, [activeGitPath, activeTab?.workspaceBaseSql, activeTab?.sql]);

  const diffQuery = useQuery({
    queryKey: commitHash ? ["workspaceGitCommitFileDiff", commitHash, path] : ["workspaceGitDiff", path],
    queryFn: () => commitHash ? workspaceApi.getGitCommitFileDiff(commitHash, path || "") : workspaceApi.getGitDiff(path || ""),
    enabled: Boolean(path) && (Boolean(commitHash) || path !== activeGitPath),
  });

  if (!path) return null;

  const diff = !commitHash && path === activeGitPath && activeScriptDiff ? activeScriptDiff : diffQuery.data?.diff;
  const subtitle = commitHash ? `Commit ${commitHash.slice(0, 8)} diff` : "Workspace diff preview";
  const diffText = diff || (diffQuery.isLoading ? "Loading diff..." : "No diff available.");

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b bg-muted/5 px-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold">{path}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => diffQuery.refetch()}
            disabled={diffQuery.isFetching || (!commitHash && path === activeGitPath)}
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
            onClick={() => {
              lab.setGitPreviewPath(null);
              lab.setGitPreviewCommitHash(null);
            }}
            aria-label="Close diff preview"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-muted/10">
        <div className="min-w-max py-3 font-mono text-xs leading-relaxed">{renderDiff(diffText)}</div>
      </div>
    </div>
  );
}

export function buildDiffEditorModels(diff: string) {
  const original: string[] = [];
  const modified: string[] = [];

  for (const line of diff.split("\n")) {
    if (shouldSkipDiffMetadata(line)) continue;
    if (line.startsWith("+")) {
      modified.push(line.slice(1));
    } else if (line.startsWith("-")) {
      original.push(line.slice(1));
    } else if (line.startsWith(" ")) {
      const content = line.slice(1);
      original.push(content);
      modified.push(content);
    }
  }

  return {
    original: original.join("\n"),
    modified: modified.join("\n"),
  };
}

function shouldSkipDiffMetadata(line: string) {
  return (
    line.startsWith("diff --git ") ||
    line.startsWith("index ") ||
    line.startsWith("--- ") ||
    line.startsWith("+++ ") ||
    line.startsWith("@@") ||
    line.startsWith("\\ No newline") ||
    line.startsWith("warning:")
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
    const marker = isAddition ? "+" : isDeletion ? "-" : "";
    const content = isAddition || isDeletion || isContext ? line.slice(1) : line;
    let lineLabel = "";

    if (isHunk) {
      const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      oldLineNumber = match ? Number(match[1]) : oldLineNumber;
      newLineNumber = match ? Number(match[2]) : newLineNumber;
    } else if (isAddition) {
      lineLabel = String(newLineNumber);
      newLineNumber += 1;
    } else if (isDeletion) {
      lineLabel = String(oldLineNumber);
      oldLineNumber += 1;
    } else if (isContext) {
      lineLabel = String(newLineNumber);
      oldLineNumber += 1;
      newLineNumber += 1;
    }

    const color = isAddition
      ? "bg-emerald-500/18 text-emerald-800 dark:text-emerald-200"
      : isDeletion
        ? "bg-rose-500/18 text-rose-800 dark:text-rose-200"
        : isHunk
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
          : isFileHeader
            ? "bg-muted/50 text-muted-foreground"
            : "text-foreground";

    return (
      <div key={`${index}-${line.slice(0, 12)}`} className={cn("grid grid-cols-[3rem_2rem_minmax(36rem,1fr)] px-3", color)}>
        <span className="select-none border-r border-border/40 pr-3 text-right text-muted-foreground/70">{lineLabel}</span>
        <span className="select-none border-r border-border/40 text-center text-muted-foreground/80">{marker}</span>
        <span className="whitespace-pre pl-3">{content || " "}</span>
      </div>
    );
  });
}
