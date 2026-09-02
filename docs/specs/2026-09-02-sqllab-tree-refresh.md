# SQLLab Database-Tree Refresh Fix

**Status:** Approved by reported defect scope

## Problem

The refresh action displayed for the expanded **Tables** folder in SQLLab starts a TanStack Query metadata refetch, but it gives no visual feedback after the tree has been initially loaded.

## Root Cause

`useSQLLabMetadata` exposes `tablesQuery.isLoading` as `isLoadingTables`. In TanStack Query, `isLoading` is false for a background/manual refetch when cached table data exists. `SidebarFolder` uses that value both for its initial-load skeleton and its refresh icon animation, so the icon never spins while refresh is in progress.

## Requirements

1. Clicking the expanded Tables-folder refresh action must continue to call the existing `refetchTables` operation, which reloads all database-tree metadata categories and selected-table metadata when applicable.
2. While that operation is fetching cached table metadata, the refresh icon must expose the `animate-spin` class.
3. Cached table entries must remain visible during the refresh; the initial-load skeleton must remain limited to an initial table load with no cached data.
4. Add a focused Vitest regression test that proves the refresh indicator is active during a pending manual refetch and inactive after it settles.

## Non-goals

- Do not add a new global tree refresh control or per-folder refresh controls.
- Do not change backend metadata routes, API contracts, query keys, or selected-object state.

## Validation

- `cd apps/web && bunx vitest run tests/hooks/use-sqllab-metadata.test.ts`
- `cd apps/web && bunx vitest run tests/components/sqllab/sqllab-sidebar.test.tsx`
- `cd apps/web && bunx tsc --noEmit`
