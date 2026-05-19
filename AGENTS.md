# QurioDB Agent Instructions

## Project Summary

QurioDB is a database management and analytics platform built as a Bun/Turbo monorepo.

The most important product target is the desktop application. The desktop app is a Tauri 2 shell that bundles the React/Vite frontend and starts the Python FastAPI backend as a local sidecar process.

## Required Context

Before making product, architecture, UI, backend, or desktop changes, read:

- `Project-Context.md`
- `README.md`
- Relevant `.codex/rules/*`

## Repository Layout

- `apps/web`: React 19 + Vite frontend.
- `apps/api`: Python FastAPI backend.
- `apps/desktop`: Tauri 2 desktop wrapper.
- `build-backend.ps1`: Builds the Python backend into the Tauri sidecar binary.
- `.codex/rules`: Project behavior rules.
- `.codex/workflows`: Project workflows.
- `.codex/skills`: Role-specific reference skills.

## Tech Stack

Frontend:

- React 19
- Vite 6
- TypeScript
- Tailwind CSS 4
- shadcn-style UI primitives
- TanStack Query and TanStack Table
- Monaco Editor
- Zustand
- Vitest

Backend:

- FastAPI, not Flask
- Uvicorn
- SQLAlchemy
- SQLite for the local system metadata database
- Connectors/loaders for SQL databases, MongoDB, Redis, DuckDB, ClickHouse, Oracle, MSSQL, MySQL, PostgreSQL and file imports
- Google Gemini dependencies for AI features
- PyInstaller for desktop sidecar packaging

Desktop:

- Tauri 2
- Rust 2021
- `tauri-plugin-shell` for sidecar startup
- `tauri-plugin-dialog`
- `tauri-plugin-log`
- Python API sidecar named `api`

Tooling:

- Bun workspaces
- Turbo
- Rust/Cargo
- Python virtual environment under `apps/api/venv`

## Desktop App Architecture

Desktop is the priority path. When changing backend or frontend behavior, consider whether it also affects the Tauri packaged app.

Startup flow:

1. Tauri starts the main window.
2. Rust code in `apps/desktop/src-tauri/src/lib.rs` spawns the backend sidecar with `shell.sidecar("api")`.
3. The sidecar starts the FastAPI app on `127.0.0.1:5000`.
4. Rust polls `http://127.0.0.1:5000/health`.
5. Once healthy, Rust emits the `backend-ready` event.
6. The frontend `DesktopReadyGuard` listens for `backend-ready` before rendering the app in Tauri.

Shutdown flow:

- On window close or app exit, Tauri kills the backend sidecar.
- On Windows, shutdown uses `taskkill /F /T /PID` to terminate the process tree.

Important desktop files:

- `apps/desktop/src-tauri/src/lib.rs`: sidecar lifecycle, health check, shutdown.
- `apps/desktop/src-tauri/tauri.conf.json`: Tauri build/dev config, external sidecar config.
- `apps/desktop/src-tauri/Cargo.toml`: Rust/Tauri dependencies.
- `apps/web/src/components/desktop-ready-guard.tsx`: frontend wait screen for backend readiness.
- `apps/web/src/lib/api-client.ts`: API base URL resolution for browser and desktop.
- `build-backend.ps1`: PyInstaller sidecar build pipeline.

## Desktop Sidecar Rules

- If Python backend code in `apps/api` changes and desktop behavior matters, rebuild the sidecar.
- Tauri uses prebuilt binaries from `apps/desktop/src-tauri/bin/`.
- The sidecar name is configured as `bin/api` in `tauri.conf.json`; Tauri resolves target-specific binaries such as `api-x86_64-pc-windows-gnu.exe`.
- Backend health must remain available at both `/health` and `/api/health`.
- Keep the backend bound to `127.0.0.1` by default to avoid Windows firewall prompts.
- Do not assume browser dev mode and desktop mode behave identically. Desktop relies on sidecar readiness and local API resolution.

Sidecar rebuild command from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File build-backend.ps1
```

GNU target desktop build command:

```powershell
bun run desktop:build
```

If the frontend production build runs out of memory, use:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
```

## Backend Notes

- Main entry point: `apps/api/app.py`.
- The app is FastAPI even if some docs/comments still say Flask.
- Default local metadata DB is SQLite at `~/.quriodb/quriodb.db`.
- `setup_database()` auto-creates tables and seeds default roles/admin when needed.
- Default admin seed is `admin` / `password123` when no users exist.
- API route prefixes are registered in `apps/api/app.py`.
- SQLAlchemy models live in `apps/api/models/metadata.py`.

## Frontend Notes

- Main router: `apps/web/src/App.tsx`.
- Main dashboard: `apps/web/src/app/page.tsx`.
- API client source of truth: `apps/web/src/lib/api-client.ts`.
- Vite dev server uses port `3001`.
- API proxy points `/api` to `http://localhost:5000` unless `VITE_API_URL` is set.
- Path alias `@` maps to `apps/web/src`.
- Do not reintroduce TypeScript `baseUrl`; it is deprecated in newer TypeScript versions.

## Common Commands

Install dependencies:

```powershell
bun install
pip install -r apps/api/requirements.txt
```

Run all dev tasks:

```powershell
bun run dev
```

Run web only:

```powershell
bun run dev:web
```

Run backend only:

```powershell
bun run dev:backend
```

Type-check web:

```powershell
cd apps/web
bunx tsc --noEmit
```

Run web tests:

```powershell
cd apps/web
bun run test
```

Run backend tests:

```powershell
cd apps/api
python -m pytest
```

## Project Rules

Read project rules when relevant:

- `.codex/rules/clean-code.md`: code quality, naming, file size, file headers.
- `.codex/rules/code-change-quality-gate.md`: mandatory quality gate for every code edit, bug fix, refactor, and generated implementation.
- `.codex/rules/tests.md`: test expectations for features, fixes, and refactors.
- `.codex/rules/documents.md`: documentation structure under `docs/`.
- `.codex/rules/research.md`: research expectations for large/uncertain tasks.
- `.codex/rules/nano-banana.md`: image generation guidance.

Known mismatch:

- Some `.codex/workflows` files still reference `.agent/rules/...`.
- In this repository, use `.codex/rules/...` instead.

## Workflows

Use these workflows when requested or when the task naturally fits:

- `.codex/workflows/debug.md`: evidence-based debugging.
- `.codex/workflows/development.md`: normal code changes and small fixes.
- `.codex/workflows/implement-feature.md`: larger feature work.
- `.codex/workflows/documentation.md`: generating architecture/API/spec docs.
- `.codex/workflows/gen-tests.md`: generating tests.
- `.codex/workflows/qa.md`: QA docs and test cases.
- `.codex/workflows/ui-ux-design.md`: UI/UX design work.
- `.codex/workflows/custom-behavior.md`: changing rules/workflows.

## Engineering Guidance

- Prefer existing project patterns over new abstractions.
- Keep desktop compatibility in mind for every backend/API change.
- Keep edits scoped; avoid unrelated rewrites.
- Do not revert user changes.
- For frontend changes, use the existing React/Vite/Tailwind/shadcn-style patterns.
- For backend changes, keep route/service/model boundaries clear.
- For desktop changes, verify sidecar startup, health checks, API URL behavior, and shutdown behavior.
- Report tests or checks run in the final response.
