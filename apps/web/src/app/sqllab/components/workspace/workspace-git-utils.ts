/**
 * @file workspace-git-utils.ts
 * @description Shared helpers for SQL Lab workspace Git panels and diff previews.
 */

export const STATUS_STYLES: Record<string, string> = {
  added: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  deleted: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  modified: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  renamed: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  conflict: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300",
  untracked: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

export const STATUS_LABELS: Record<string, string> = {
  added: "A",
  deleted: "D",
  modified: "M",
  renamed: "R",
  conflict: "!",
  untracked: "U",
};

export function normalizeRelativePath(path: string | null | undefined) {
  return (path || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function getScriptsRootLabel(workspace: any) {
  if (!workspace?.scriptsPath || !workspace?.rootPath) return "";
  return workspace.scriptsPath.replace(workspace.rootPath, "").replace(/^[/\\]/, "");
}

export function toWorkspaceScriptPath(gitPath: string, scriptsRootLabel: string) {
  const normalizedPath = normalizeRelativePath(gitPath);
  const scriptsRoot = normalizeRelativePath(scriptsRootLabel);
  if (!normalizedPath.endsWith(".sql")) return null;
  if (!scriptsRoot) return normalizedPath;
  if (normalizedPath === scriptsRoot) return null;
  if (!normalizedPath.startsWith(`${scriptsRoot}/`)) return null;
  return normalizedPath.slice(scriptsRoot.length + 1);
}

export function toGitPath(scriptPath: string | undefined, scriptsRootLabel: string) {
  if (!scriptPath) return null;
  const cleanPath = normalizeRelativePath(scriptPath);
  const scriptsRoot = normalizeRelativePath(scriptsRootLabel);
  if (!scriptsRoot || cleanPath === scriptsRoot || cleanPath.startsWith(`${scriptsRoot}/`)) return cleanPath;
  return `${scriptsRoot}/${cleanPath}`;
}

export function buildChangeSummary(changes: any[]) {
  return changes.reduce(
    (summary, change) => {
      if (change.status === "added") summary.added += 1;
      else if (change.status === "modified") summary.modified += 1;
      else if (change.status === "deleted") summary.deleted += 1;
      else if (change.status === "untracked") summary.untracked += 1;
      return summary;
    },
    { added: 0, modified: 0, deleted: 0, untracked: 0 },
  );
}

export async function chooseWorkspaceRootFolder(options: {
  currentRootPath?: string;
  isTauri: boolean;
  openTauriFolder: (defaultPath?: string) => Promise<string | null>;
  pickBackendFolder: (initialPath?: string) => Promise<string | null>;
}) {
  const initialPath = options.currentRootPath || undefined;
  return options.isTauri ? options.openTauriFolder(initialPath) : options.pickBackendFolder(initialPath);
}
