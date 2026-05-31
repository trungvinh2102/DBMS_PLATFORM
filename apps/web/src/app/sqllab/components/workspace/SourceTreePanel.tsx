/**
 * @file SourceTreePanel.tsx
 * @description Repository source tree browser for SQL Lab workspace files.
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmptyState } from "./WorkspacePanelShared";
import type { WorkspaceFile } from "./workspace-panel-types";

type TreeNode = {
  path: string;
  name: string;
  type: WorkspaceFile["type"];
  gitStatus?: string | null;
  children: TreeNode[];
};

type SourceTreePanelProps = {
  repositoryName: string;
  files: WorkspaceFile[];
  selectedPath?: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectFile: (path: string) => void;
};

export function SourceTreePanel({ repositoryName, files, selectedPath, isLoading, onRefresh, onSelectFile }: SourceTreePanelProps) {
  const tree = useMemo(() => buildSourceTree(files), [files]);
  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRootExpanded, setIsRootExpanded] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(["sql"]));
  const visibleTree = useMemo(() => filterSourceTree(tree, searchQuery), [tree, searchQuery]);
  const visibleFolderPaths = useMemo(() => collectFolderPaths(visibleTree), [visibleTree]);
  const normalizedSearch = searchQuery.trim();

  const toggleFolder = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  const expandAll = () => setExpandedPaths(new Set(folderPaths));
  const collapseAll = () => setExpandedPaths(new Set());
  const effectiveExpandedPaths = normalizedSearch ? new Set([...expandedPaths, ...visibleFolderPaths]) : expandedPaths;

  return (
    <section className="flex h-[clamp(30rem,72vh,64rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex h-7 shrink-0 items-center justify-between bg-primary/15 px-1.5 text-primary">
        <button
          type="button"
          className="grid min-w-0 flex-1 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-1 text-left text-xs font-semibold uppercase"
          onClick={() => setIsRootExpanded((current) => !current)}
          title={repositoryName}
        >
          {isRootExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="truncate">{repositoryName}</span>
          <Badge variant="outline" className="h-5 border-primary/30 px-1.5 text-[10px] text-primary">
            {files.length}
          </Badge>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/15" onClick={expandAll} aria-label="Expand all folders" title="Expand all">
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/15" onClick={collapseAll} aria-label="Collapse all folders" title="Collapse all">
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/15" onClick={onRefresh} aria-label="Refresh source tree" title="Refresh">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>
      {isRootExpanded ? (
        <div className="border-b py-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter files"
              className="h-7 rounded-sm border-border/70 bg-muted/20 pl-7 font-mono text-xs"
              aria-label="Filter source tree files"
            />
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto py-1">
        {isLoading ? (
          <SourceTreeSkeleton />
        ) : !isRootExpanded ? null : tree.length === 0 ? (
          <div className="p-2">
            <EmptyState title="No files" text="Workspace files will appear here after choosing a Git root." />
          </div>
        ) : visibleTree.length === 0 ? (
          <div className="p-2">
            <EmptyState title="No matches" text="Try a different file or folder name." />
          </div>
        ) : (
          <div className="grid">
            {visibleTree.map((node) => (
              <SourceTreeRow
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                expandedPaths={effectiveExpandedPaths}
                onToggleFolder={toggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SourceTreeRow({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onToggleFolder,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const Icon = isFolder ? (isExpanded ? FolderOpen : Folder) : isSqlFile(node.name) ? FileCode2 : FileText;
  const statusClassName = getGitStatusClassName(node.gitStatus);

  return (
    <>
      <button
        type="button"
        onClick={() => (isFolder ? onToggleFolder(node.path) : onSelectFile(node.path))}
        className={cn(
          "grid h-6 w-full grid-cols-[1rem_1rem_minmax(0,1fr)_auto] items-center gap-1 rounded-sm px-1 text-left text-xs transition-colors",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected && "bg-primary/15 text-primary",
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        title={node.path}
      >
        <span className="grid h-4 w-4 place-items-center">
          {isFolder ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : null}
        </span>
        <Icon className={cn("h-3.5 w-3.5", isFolder ? "text-amber-600" : getFileIconClassName(node.name))} />
        <span className="min-w-0 truncate font-mono leading-none">{node.name}</span>
        {node.gitStatus ? (
          <Badge variant="outline" className={cn("h-4 shrink-0 rounded-sm px-1 font-mono text-[10px]", statusClassName)}>
            {node.gitStatus}
          </Badge>
        ) : null}
      </button>
      {isFolder && isExpanded
        ? node.children.map((child) => (
          <SourceTreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggleFolder={onToggleFolder}
            onSelectFile={onSelectFile}
          />
        ))
        : null}
    </>
  );
}

function SourceTreeSkeleton() {
  return (
    <div className="grid gap-1 p-1" aria-busy="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid h-6 grid-cols-[1rem_minmax(0,1fr)_2rem] items-center gap-2 px-1">
          <span className="h-3.5 w-3.5 animate-pulse rounded bg-muted" />
          <span className={cn("h-3 animate-pulse rounded bg-muted", index % 3 === 0 ? "w-28" : "w-full")} />
          <span className="h-3 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function buildSourceTree(files: WorkspaceFile[]) {
  const root: TreeNode = { path: "", name: "", type: "folder", children: [] };
  const byPath = new Map<string, TreeNode>([["", root]]);

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let parent = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = index === parts.length - 1;
      const type = isLeaf ? file.type : "folder";
      const existing = byPath.get(currentPath);

      if (existing) {
        parent = existing;
        return;
      }

      const node: TreeNode = {
        path: currentPath,
        name: part,
        type,
        gitStatus: isLeaf ? file.gitStatus : undefined,
        children: [],
      };
      parent.children.push(node);
      byPath.set(currentPath, node);
      parent = node;
    });
  }

  sortTree(root.children);
  return root.children;
}

export function filterSourceTree(nodes: TreeNode[], query: string): TreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return nodes;

  return nodes.reduce<TreeNode[]>((matches, node) => {
    const isMatch = node.name.toLowerCase().includes(normalizedQuery) || node.path.toLowerCase().includes(normalizedQuery);
    const childMatches = isMatch ? node.children : filterSourceTree(node.children, normalizedQuery);

    if (isMatch || childMatches.length > 0) {
      matches.push({ ...node, children: childMatches });
    }

    return matches;
  }, []);
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
  nodes.forEach((node) => sortTree(node.children));
}

function isSqlFile(name: string) {
  return name.toLowerCase().endsWith(".sql");
}

function getFileIconClassName(name: string) {
  const extension = name.toLowerCase().split(".").pop();
  if (extension === "sql") return "text-sky-600";
  if (extension === "py") return "text-blue-500";
  if (extension === "json") return "text-amber-500";
  if (extension === "md") return "text-violet-500";
  if (extension === "ts" || extension === "tsx") return "text-blue-600";
  return "text-muted-foreground";
}

function collectFolderPaths(nodes: TreeNode[]) {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.type !== "folder") continue;
    paths.push(node.path);
    paths.push(...collectFolderPaths(node.children));
  }

  return paths;
}

function getGitStatusClassName(status?: string | null) {
  if (!status) return undefined;
  if (status.includes("A") || status.includes("?")) return "border-emerald-500/40 text-emerald-600";
  if (status.includes("D")) return "border-destructive/40 text-destructive";
  if (status.includes("M")) return "border-amber-500/40 text-amber-600";
  return "text-muted-foreground";
}
