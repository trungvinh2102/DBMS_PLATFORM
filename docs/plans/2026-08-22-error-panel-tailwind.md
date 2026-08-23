# ErrorPanel Tailwind Implementation Plan

> **For agentic workers:** Use `dispatching-parallel-agents` (or `executing-plans`) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ErrorPanel's dedicated stylesheet with equivalent Tailwind utilities while preserving its current UI and interaction behavior.

**Architecture:** Keep the existing `ErrorPanel` public props, render tree, severity helpers, and inline dynamic `maxHeight` style. Replace each CSS selector with colocated Tailwind classes in `ErrorPanel.tsx`; encode severity-specific icon and label colors through a helper that returns the exact utility classes needed by each severity. Remove the obsolete CSS import and stylesheet.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vite, Vitest.

**Spec:** Approved bounded design in chat on 2026-08-22.

## Global Constraints

- Do not add dependencies or change ErrorPanel's exported API (`ErrorPanelProps`, `ErrorPanel`, and default export).
- Preserve keyboard activation: Enter and Space must invoke `onErrorClick` with the item's line and column.
- Preserve the existing visual semantics for the panel, header, empty state, hover/focus states, locations, and all four severity color schemes.
- Preserve `maxHeight` as an inline dynamic style because it is a numeric runtime prop.
- Do not modify unrelated Monaco components, global styles, or desktop behavior.

---

## File Map

- Modify: `apps/web/src/lib/monaco/ErrorPanel.tsx` — colocate all presentation styling as Tailwind classes and remove the dedicated stylesheet import.
- Delete: `apps/web/src/lib/monaco/ErrorPanel.css` — all of its selectors are replaced in the component.
- Add: `apps/web/src/app/dev/error-panel-fixture/page.tsx` — development-only deterministic browser fixture for visual verification; it is not a production user flow.
- Modify: `apps/web/src/App.tsx` — register the fixture route only while `import.meta.env.DEV` is true.
- Add: `apps/web/src/lib/monaco/ErrorPanel.test.tsx` — direct rendering and interaction coverage for the refactor.

### Task 1: Migrate ErrorPanel styling to Tailwind

**Files:**
- Modify: `apps/web/src/lib/monaco/ErrorPanel.tsx:14-154`
- Delete: `apps/web/src/lib/monaco/ErrorPanel.css`
- Test: Existing web typecheck/build; no existing ErrorPanel-specific test file was identified during reconnaissance.

**Interfaces:**
- Consumes: `ErrorPanelEntry`, `MarkerSeverity`, and the existing `ErrorPanelProps` API.
- Produces: The unchanged `ErrorPanel` component, with no CSS-file import or dependency.

- [ ] **Step 1: Establish the baseline type/build result**

Run from `apps/web`:

```bash
bun run build
```

Expected: Exit code 0 before the refactor. If it does not pass, record the pre-existing failure verbatim and continue only with focused validation that can distinguish it from this change.

- [ ] **Step 2: Map each CSS selector to the equivalent Tailwind utilities**

In `ErrorPanel.tsx`, remove:

```ts
import "./ErrorPanel.css";
```

Replace the existing selector class names using this exact behavioral mapping:

```text
.error-panel          -> border-t border-border bg-muted text-xs
.error-panel-header   -> flex items-center justify-between border-b border-border bg-muted px-3 py-1.5
.title                -> font-semibold text-foreground
.count                -> text-[11px] text-[#888]
.error-list           -> overflow-y-auto py-1
.empty-state          -> flex items-center justify-center gap-2 p-5 text-gray-500
.check-icon           -> text-base text-green-500
.error-item           -> flex cursor-pointer items-center gap-2 px-3 py-1.5 transition-colors duration-150 hover:bg-white/[0.05] focus:outline-none focus:bg-white/[0.08]
.severity-icon        -> flex shrink-0 items-center
.location             -> shrink-0 font-mono text-[11px] text-gray-500
.message              -> flex-1 truncate text-foreground
.severity-label       -> shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-semibold uppercase
```

Replace `getSeverityClass` with a severity-style helper returning the exact icon and label utility classes:

```ts
const getSeverityClasses = (severity: MarkerSeverity) => {
  switch (severity) {
    case MarkerSeverity.Warning:
      return { icon: "text-amber-400", label: "bg-amber-500/20 text-amber-400" };
    case MarkerSeverity.Info:
      return { icon: "text-blue-400", label: "bg-blue-500/20 text-blue-400" };
    case MarkerSeverity.Hint:
      return { icon: "text-violet-400", label: "bg-violet-500/20 text-violet-400" };
    case MarkerSeverity.Error:
    default:
      return { icon: "text-red-400", label: "bg-red-500/20 text-red-400" };
  }
};
```

For each rendered error, compute `const severityClasses = getSeverityClasses(error.severity)` inside the map callback. Apply `severityClasses.icon` to the icon span and `severityClasses.label` to the severity label span. Do not retain `severity-*` selector classes.

- [ ] **Step 3: Remove the obsolete dedicated stylesheet**

Delete `apps/web/src/lib/monaco/ErrorPanel.css`. Confirm no import or source reference remains:

```bash
rg 'ErrorPanel\.css|error-panel-header|severity-error' apps/web/src
```

Expected: No matches.

- [ ] **Step 4: Validate the completed refactor**

Run from `apps/web`:

```bash
bun run build
```

Expected: Exit code 0; TypeScript accepts the updated component and Vite processes the Tailwind utilities.

Then inspect the diff to prove scope and semantic preservation:

```bash
git diff --check
```

Expected: `git diff --check` has no output; the only product files changed are the component and deleted stylesheet, and the keyboard handlers, callback arguments, `maxHeight` inline style, title/count/empty branches, and four severity states remain present.

- [ ] **Step 5: Commit**

If this task runs in a worktree release workflow, the integrator/release process creates the commit. Use this commit message:

```text
refactor(web): migrate ErrorPanel styles to Tailwind
```

## Plan Self-Review

- **Coverage:** Task 1 covers CSS import removal, all selector equivalents, four severity presentations, deletion of the stylesheet, and build/diff evidence.
- **Placeholders:** None.
- **Type consistency:** No public types or signatures change; `getSeverityClasses` is an internal helper consumed only by the component render loop.

### Task 2: Add a development-only browser verification fixture

**Files:**
- Create: `apps/web/src/app/dev/error-panel-fixture/page.tsx`
- Modify: `apps/web/src/App.tsx:21-30,49-60`
- Modify: `apps/web/src/lib/monaco/ErrorPanel.test.tsx:25-92`

**Interfaces:**
- Consumes: the existing default `ErrorPanel` export and `MarkerSeverity` / `ErrorPanelEntry` types.
- Produces: a development-only route at `/__test/error-panel` that renders deterministic populated and empty panels; no production route is registered.

- [ ] **Step 1: Extend the direct test before changing its fixture coverage**

Add a failing assertion to `ErrorPanel.test.tsx` that renders `ErrorPanel` with `maxHeight={90}` and verifies the list container has `style.maxHeight === "90px"`.

Run:

```bash
cd apps/web && bun run test --run src/lib/monaco/ErrorPanel.test.tsx
```

Expected: FAIL before the test assertion is added to the suite's passing coverage; after adding the assertion, it must pass against the unchanged component because the inline runtime style is already preserved.

- [ ] **Step 2: Create the deterministic development fixture page**

Create `apps/web/src/app/dev/error-panel-fixture/page.tsx` with the required file header. Import `ErrorPanel`, `MarkerSeverity`, and `ErrorPanelEntry`. Render one panel titled `ErrorPanel visual fixture` with four entries — Error, Warning, Info, and Hint — and `maxHeight={90}`; render a second empty panel titled `ErrorPanel empty fixture`. Use only Tailwind layout utilities on the page; no API calls, state, or production data.

- [ ] **Step 3: Register a development-only route**

In `App.tsx`, add a lazy `DevErrorPanelFixturePage` import to `createPages`. Within the existing `Routes`, register this route exactly once and only under `import.meta.env.DEV`:

```tsx
{import.meta.env.DEV && (
  <Route path="/__test/error-panel" element={<pages.DevErrorPanelFixturePage />} />
)}
```

Do not add it to the header or any navigation. The route stays behind the existing application provider/auth structure and is absent from production route registration.

- [ ] **Step 4: Verify with browser and automated checks**

Run the focused unit test and build:

```bash
cd apps/web && bun run test --run src/lib/monaco/ErrorPanel.test.tsx
bun run build
```

Start the web development server, then use Playwright at `http://localhost:3001/__test/error-panel`. Verify both fixture headings; the populated panel's four labels/icons; the empty-state text; the populated list's `max-height: 90px`; and row click/Enter/Space behavior if the fixture exposes callbacks. Persist a screenshot/snapshot only under `.playwright-mcp/EP-1/`.

Expected: all checks pass, and the production build succeeds while the route registration remains guarded by `import.meta.env.DEV`.

- [ ] **Step 5: Commit**

If this task runs in a worktree release workflow, the integrator/release process creates the commit. Use this commit message:

```text
test(web): add ErrorPanel browser verification fixture
```

### Task 3: Serve the fixture only from the Vite development server

**Files:**
- Modify: `apps/web/src/App.tsx:1-94`
- Modify: `apps/web/vite.config.ts:1-69`
- Create: `apps/web/src/app/dev/error-panel-fixture/entry.tsx`
- Keep: `apps/web/src/app/dev/error-panel-fixture/page.tsx`

**Interfaces:**
- Consumes: Vite's development-server plugin hook and the existing fixture page.
- Produces: `http://localhost:3001/__test/error-panel` only while `vite` is running in serve mode; the application router remains unchanged and the production Rollup module graph has no fixture module or chunk.

- [ ] **Step 1: Restore the product router in `App.tsx`**

Remove `SHOW_DEV_FIXTURES`, `ErrorPanelFixturePage`, and the conditional router branch. Restore the original always-rendered `AuthGuard` product shell and its complete route list. `App.tsx` must contain no import, lazy import, route string, or reference to `error-panel-fixture` or `/__test/error-panel`.

- [ ] **Step 2: Add an isolated Vite serve-mode middleware**

In `vite.config.ts`, change the config callback signature to receive `command`. Add a plugin only when `command === "serve"`. Its `configureServer` middleware handles only `/__test/error-panel`, responds with transformed HTML containing a root element and a module script for `/src/app/dev/error-panel-fixture/entry.tsx`, and calls `next()` for every other request. Do not add the plugin during `vite build`.

- [ ] **Step 3: Add the fixture browser entrypoint**

Create `entry.tsx` with a file header. It imports React, `createRoot`, `../../../index.css`, and the fixture page, then renders the fixture page into `#root`. It has no router, auth, API, or product-shell dependency.

- [ ] **Step 4: Verify development coexistence and production exclusion**

Run the direct ErrorPanel test and full app test suite. Start Vite in serve mode and verify both `/__test/error-panel` and `/` return usable pages; the latter must not self-redirect. Run a production build and scan `dist` for `/__test/error-panel`, `ErrorPanel visual fixture`, `ErrorPanel empty fixture`, and the fixture module path. All scans must return no matches. Persist browser evidence only under `.playwright-mcp/EP-2/`.
