# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

QurioDB — desktop-first DB management + analytics platform. Bun/Turbo monorepo, three apps. **Desktop (Tauri) is the priority target**, not web. Every backend/frontend change must be evaluated for desktop-packaged impact (sidecar packaging, health checks, API URL resolution, shutdown). See `AGENTS.md` and `Project-Context.md` for full product/architecture context — read them before non-trivial product, backend, or desktop work.

## Apps

- `apps/web` — React 19 + Vite 6 + TS + Tailwind 4 + TanStack Query/Table + Monaco + Zustand. Router: `src/App.tsx`. API client (URL resolution for browser vs Tauri): `src/lib/api-client.ts`. Path alias `@` → `apps/web/src`.
- `apps/api` — FastAPI (not Flask, despite stale comments). Entry: `app.py` → `core/routers.py` wires all routers under `/api/*`. SQLAlchemy + local SQLite metadata DB. Layered: `routes/` → `services/` → `models/`; keep those boundaries.
- `apps/desktop` — Tauri 2 / Rust shell. Bundles web UI, spawns the API as a sidecar. Lifecycle (spawn, health-poll, shutdown): `src-tauri/src/lib.rs`.

## Commands

Repo docs are written for Windows/PowerShell; **this environment is Linux** — translate `$env:X="y"` to `X=y` and skip the `.ps1`/`.bat` scripts.

```bash
bun install
pip install -r apps/api/requirements.txt   # backend deps (apps/api dev uses venv/Scripts/python — Windows path; on Linux run python app.py directly)

bun run dev            # web + api (turbo)
bun run dev:web        # web only (Vite on :3001, proxies /api → :5000)
bun run dev:backend    # api only (FastAPI on 127.0.0.1:5000)

bun run lint           # turbo lint
bun run check-types    # turbo check-types  (web: cd apps/web && bunx tsc --noEmit)
bun run format         # prettier
```

Web tests (Vitest):
```bash
cd apps/web && bun run test                              # watch
cd apps/web && bunx vitest run                           # once
cd apps/web && bunx vitest run src/x.test.ts -t "name"   # single file / test
```

Backend tests (pytest, from `apps/api`):
```bash
cd apps/api && python -m pytest
cd apps/api && python -m pytest -m rag    # RAG/AI/streaming regression suite (also: bun run test:rag)
python -m pytest path/to/test.py::test_name
```

Desktop build (Windows-only toolchain): `bun run desktop:build`. After editing `apps/api/` Python that desktop needs, the sidecar binary in `apps/desktop/src-tauri/bin/` must be rebuilt (`build-backend.ps1`) or the packaged app keeps running stale `api.exe`.

## Runtime / data model

- Local metadata DB auto-created at `~/.quriodb/quriodb.db` on first run; `setup_database()` creates tables + seeds default roles and `admin`/`password123` when no users exist. No external DB needed for app metadata. Seed manually: `python apps/api/scripts/seed.py`.
- Health must stay available at both `/health` and `/api/health`; bind backend to `127.0.0.1` (desktop startup + Windows firewall depend on this).
- Desktop readiness: Rust emits `backend-ready` after health poll succeeds; frontend `apps/web/src/components/desktop-ready-guard.tsx` gates rendering on it. Don't assume the API is reachable immediately on desktop startup.

## AI / RAG subsystem (the most intricate part)

AI Assistant lives mainly in SQL Lab. Runtime is **LangChain** with provider adapters (OpenAI-compatible, Gemini, Anthropic Claude, Qwen, DeepSeek); internal message format is OpenAI-style. Provider keys are stored **encrypted in the local metadata DB** via Settings → AI Assistant, not env vars.

Key flow: `POST /api/ai/stream` (SSE) → `services/ai_service.py` coordinates query-understanding → RAG context build → LangChain stream → tagged-event parsing (thinking / sql / analysis / citations / warnings). SQL-generation intents additionally preview generated SQL read-only and let the model repair failures up to twice.

- Routers registered in `apps/api/core/routers.py`; AI routes: `routes/ai*.py`, `routes/rag.py`.
- Service runtime: `services/ai/langchain_runtime.py`; retrieval: `services/ai/retrieval/*`.
- Frontend: `apps/web/src/app/sqllab/hooks/useAIChat.ts`, `.../components/AIAssistant.tsx`.
- RAG defaults on, desktop-safe; vector backend `sqlite_json` (optional `sqlite_vec`). Endpoints under `/api/rag`. Full ingestion/retrieval diagrams are in `README.md`.

## Notes / gotchas

- `AGENTS.md` references `.codex/rules`, `.codex/workflows`, `docs/`, and `bts.jsonc` describes a Next.js/Prisma/tRPC/Postgres stack — **all stale/inaccurate**. The actual stack is the one above (React Router, SQLAlchemy/SQLite, REST). Trust the code, not those references.
- Do not reintroduce TS `baseUrl` (deprecated); the `@` alias is configured via `vite-tsconfig-paths`.
- Default branch is `dev`.
