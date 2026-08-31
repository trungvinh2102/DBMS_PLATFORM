# Tách SettingsContent Implementation Plan

> **For agentic workers:** Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách `SettingsContent` từ `apps/web/src/app/settings/page.tsx` thành component riêng tại `apps/web/src/app/settings/components/SettingsContent.tsx`.

**Architecture:** Tạo component `SettingsContent` trong `apps/web/src/app/settings/components/SettingsContent.tsx`, giữ nguyên toàn bộ logic hook, sync data, keyboard shortcut và render tab. Trong `apps/web/src/app/settings/page.tsx`, import và render `SettingsContent` bên trong `SettingsActionsProvider`.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Lucide React, Tailwind CSS.

## Global Constraints

- Tuân thủ clean-code rules và file headers (`@file`, `@description`).
- Giữ nguyên toàn bộ behavior, shortcuts (Ctrl/Cmd+S), API sync và tabs.
- Không phá vỡ tests hiện có (`tests/components/settings/settings-layout.test.tsx`).

---

### Task 1: Tạo component SettingsContent riêng và cập nhật page.tsx

**Files:**
- Create: `apps/web/src/app/settings/components/SettingsContent.tsx`
- Modify: `apps/web/src/app/settings/page.tsx`

**Interfaces:**
- Produces: `export function SettingsContent(): React.JSX.Element | null` trong `apps/web/src/app/settings/components/SettingsContent.tsx`

- [ ] **Step 1: Tạo file `apps/web/src/app/settings/components/SettingsContent.tsx`**
- [ ] **Step 2: Cập nhật `apps/web/src/app/settings/page.tsx` để import `SettingsContent` từ `components/SettingsContent`**
- [ ] **Step 3: Chạy TypeScript type-check và tests để verify**
  - Run: `cd apps/web && bunx tsc --noEmit && bun run test`
