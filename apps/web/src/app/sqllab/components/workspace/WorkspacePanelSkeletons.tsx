/**
 * @file WorkspacePanelSkeletons.tsx
 * @description Loading skeletons for SQL Lab workspace Git panels.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function RepositorySkeleton() {
  return (
    <PanelSkeleton titleWidth="w-24">
      <SkeletonBlock className="h-16" />
      <SkeletonLine className="w-32" />
      <SkeletonLine />
      <SkeletonLine className="w-24" />
      <SkeletonLine />
      <SkeletonBlock className="h-56" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </PanelSkeleton>
  );
}

export function ChangesSkeleton() {
  return (
    <PanelSkeleton titleWidth="w-28">
      <div className="flex gap-2">
        <SkeletonPill />
        <SkeletonPill />
        <SkeletonPill />
        <SkeletonPill />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-center gap-2 rounded-md border border-border/50 p-2"
        >
          <span className="h-4 w-4 animate-pulse rounded border bg-muted" />
          <span className="grid gap-1">
            <SkeletonLine />
            <SkeletonLine className="w-20" />
          </span>
          <SkeletonPill />
        </div>
      ))}
    </PanelSkeleton>
  );
}

export function GraphSkeleton() {
  return (
    <PanelSkeleton titleWidth="w-16" compact>
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center px-2 py-1">
          <div className="relative flex justify-center">
            <span className="absolute bottom-[-0.5rem] top-4 w-px bg-border" />
            <span className="relative mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="grid min-w-0 gap-1">
            <SkeletonLine />
            <SkeletonLine className="w-28" />
          </div>
        </div>
      ))}
    </PanelSkeleton>
  );
}

function PanelSkeleton({
  children,
  titleWidth,
  compact = false,
}: {
  children: ReactNode;
  titleWidth: string;
  compact?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
        <div className={cn("h-3 animate-pulse rounded bg-muted", titleWidth)} />
        <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
      </div>
      <div className={cn("grid gap-3", compact ? "py-2" : "p-3")}>{children}</div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md border border-border/60 bg-muted/40", className)} />;
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("h-3 animate-pulse rounded bg-muted", className || "w-full")} />;
}

function SkeletonPill() {
  return <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />;
}
