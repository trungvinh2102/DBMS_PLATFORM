# SQLLab Database-Tree Refresh Fix Implementation Plan

> **For agentic workers:** Use `dispatching-parallel-agents` (or `executing-plans`) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a loading state on SQLLab’s database-tree refresh action during manual metadata refetches without replacing cached tree entries with a skeleton.

**Architecture:** Keep the existing `refetchAll` implementation and its `refetchTables` alias. Add a separate fetching-state value at the metadata-hook boundary, retain the existing initial-load state for the table skeleton, and pass the fetching state only to the refresh-icon concern in `SidebarFolder`.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Vitest, React Testing Library, Tailwind CSS.

**Spec:** `docs/specs/2026-09-02-sqllab-tree-refresh.md`

## Global Constraints

- Preserve the existing `refetchTables`/`refetchAll` behavior and query keys.
- Use TanStack Query `isFetching` for post-cache manual-refetch feedback; retain `isLoading` for the initial table skeleton.
- Do not change API/backend/desktop files or add dependencies.
- Keep selected schema, selected table, and visible cached tree items intact during refetch.

---

## File Map

- Modify `apps/web/src/app/sqllab/hooks/use-sqllab-metadata.ts`: expose an explicit table-metadata fetching boolean separately from `isLoadingTables`.
- Modify `apps/web/src/app/sqllab/components/SQLLabSidebar.tsx`: pass initial-load and manual-refresh states to the Tables `SidebarFolder`.
- Modify `apps/web/src/app/sqllab/components/sidebar/SidebarFolder.tsx`: use separate props for the initial skeleton and refresh animation.
- Modify `apps/web/tests/components/sqllab/sqllab-sidebar.test.tsx`: prove the refresh action invokes the supplied refresh handler and applies/removes the spin class according to pending fetch state.

### Task 1: Separate initial loading from manual refresh feedback

**Files:**
- Modify: `apps/web/src/app/sqllab/hooks/use-sqllab-metadata.ts:258-274`
- Modify: `apps/web/src/app/sqllab/components/SQLLabSidebar.tsx` (Tables `SidebarFolder` call site)
- Modify: `apps/web/src/app/sqllab/components/sidebar/SidebarFolder.tsx:10-40, 74-97`
- Test: `apps/web/tests/components/sqllab/sqllab-sidebar.test.tsx`

**Interfaces:**
- Consumes: `tablesQuery.isLoading` and `tablesQuery.isFetching` from TanStack Query; the existing `refetchTables: refetchAll` function.
- Produces: a `isFetchingTables: boolean` metadata-hook value; `SidebarFolder` props that distinguish `isLoading` (initial skeleton) from `isRefreshing` (refresh icon state).

- [ ] **Step 1: Write the failing sidebar regression test**

Extend the existing context mock with a pending-refresh state and render the Tables folder expanded. Click its refresh button, then assert both invocation and icon state:

```tsx
await user.click(screen.getByRole("button", { name: /refresh tables/i }));
expect(mockLab.refetchTables).toHaveBeenCalledTimes(1);
expect(screen.getByTestId("tables-refresh-icon")).toHaveClass("animate-spin");
```

Rerender with `isRefreshingTables: false` and assert:

```tsx
expect(screen.getByTestId("tables-refresh-icon")).not.toHaveClass("animate-spin");
expect(screen.getByText("users")).toBeVisible();
```

If the current markup has no accessible name or test id, add the minimal semantic `aria-label="Refresh tables"` to the existing refresh button and `data-testid="tables-refresh-icon"` only for the Tables folder’s icon assertion.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
cd apps/web && bunx vitest run tests/components/sqllab/sqllab-sidebar.test.tsx
```

Expected: FAIL because the current sidebar receives only `isLoadingTables`, which is false during a populated-cache manual refetch, and does not expose the required refresh-state contract.

- [ ] **Step 3: Add the minimal state contract and presentation change**

In `useSQLLabMetadata`, keep:

```ts
isLoadingTables: tablesQuery.isLoading,
```

and add:

```ts
isFetchingTables: tablesQuery.isFetching,
```

Forward `isFetchingTables` through the existing SQLLab hook/context shape as required by its type/value definitions. In `SQLLabSidebar`, continue passing `isLoadingTables` for initial content loading and pass `isFetchingTables` as the Tables folder’s `isRefreshing` value. In `SidebarFolder`, keep the skeleton conditional on `isLoading && id === "tables"` and use `isRefreshing` exclusively for `RefreshCw`’s `animate-spin` class. Do not alter `onRefresh`, which must continue calling `refetchTables`.

- [ ] **Step 4: Run focused tests and type check**

Run:

```bash
cd apps/web && bunx vitest run tests/components/sqllab/sqllab-sidebar.test.tsx
cd apps/web && bunx vitest run tests/hooks/use-sqllab-metadata.test.ts
cd apps/web && bunx tsc --noEmit
```

Expected: all commands PASS. The sidebar test proves that refreshing shows the icon state while preserving cached `users` content; metadata-hook tests preserve the all-query `refetchAll` contract.

- [ ] **Step 5: Verify scope and report**

Confirm the diff is limited to the four listed frontend files (plus any directly necessary SQLLab context type/value forwarding file discovered by TypeScript), contains no backend/API/desktop edits, and remains unstaged. Report the exact test output and any unavoidable forwarding file.

## Plan Self-Review

- **Spec coverage:** Task 1 preserves `refetchTables`, supplies manual-refetch feedback, preserves cached entries and the initial-load skeleton, and adds focused regression evidence.
- **Placeholder scan:** No placeholder implementation or test instructions remain.
- **Type consistency:** The planned hook value is `isFetchingTables`; the component prop is `isRefreshing`; `isLoading` retains its existing initial-load meaning.
