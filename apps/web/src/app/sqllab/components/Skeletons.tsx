/**
 * @file Skeletons.tsx
 * @description Loading skeleton components for lazy-loaded SQL Lab components.
 * Provides visual feedback while components are being loaded.
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton for sidebar panels (AI Assistant, etc.)
 */
export function SidebarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("h-full w-full bg-background p-4 space-y-4", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-5 bg-muted animate-pulse rounded" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for right panels (Object Panel, History Panel)
 */
export function PanelSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("h-full w-full bg-background p-4 space-y-4", className)}>
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 bg-muted animate-pulse rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted/50 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for result panel
 */
export function ResultPanelSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("h-full w-full bg-background flex flex-col", className)}>
      {/* Toolbar skeleton */}
      <div className="h-10 border-b flex items-center px-4 gap-2">
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading results...</div>
      </div>
    </div>
  );
}

/**
 * Simple loading text for dialogs
 */
export function DialogSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Editor loading skeleton - Theme-responsive Monaco Editor skeleton
 * Matches the exact structure of SQLEditor component to prevent layout shifts
 */
export const EditorLoadingSkeleton = () => {
  return (
    <div className="sql-editor-container h-full w-full flex flex-col overflow-hidden">
      <div className="editor-area flex-1 min-h-0 overflow-hidden">
        {/* Monaco Editor skeleton - matches Editor component */}
        <div className="relative h-full w-full flex flex-col bg-[#fffffe] dark:bg-[#1e1e1e]">
          {/* Simulated editor with line numbers */}
          <div className="flex-1 flex min-h-0">
            {/* Line numbers gutter - matches Monaco's gutter */}
            <div className="w-12.5 flex flex-col items-end pr-3 pt-3 space-y-1.5 bg-[#fffffe] dark:bg-[#1e1e1e] shrink-0">
              {Array.from({ length: 5 }).map((_, n) => (
                <div
                  key={n}
                  className="h-4.5 w-2.5 rounded-sm bg-[#d4d4d4]/40 dark:bg-[#6e6e6e]/40"
                />
              ))}
            </div>
            {/* Editor content area - wider lines matching image 2 */}
            <div className="flex-1 pt-3 pl-2 pr-4 space-y-1.5 bg-[#fffffe] dark:bg-[#1e1e1e] overflow-hidden">
              <div className="h-4.5 w-[85%] rounded-sm bg-[#e4e4e4] dark:bg-[#2d2d2d]" />
              <div className="h-4.5 w-[92%] rounded-sm bg-[#e4e4e4] dark:bg-[#2d2d2d]" />
              <div className="h-4.5 w-[78%] rounded-sm bg-[#e4e4e4] dark:bg-[#2d2d2d]" />
              <div className="h-4.5 w-[95%] rounded-sm bg-[#e4e4e4] dark:bg-[#2d2d2d]" />
              <div className="h-4.5 w-[88%] rounded-sm bg-[#e4e4e4] dark:bg-[#2d2d2d]" />
            </div>
          </div>
          {/* Loading indicator overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background/80 dark:bg-[#1e1e1e]/80 backdrop-blur-sm shadow-lg">
              <div className="h-4 w-4 border-2 rounded-full animate-spin border-muted-foreground/30 border-t-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Loading Editor...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
