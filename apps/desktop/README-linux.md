# Building the QurioDB desktop app on Ubuntu/Linux

Tauri 2 builds native Linux bundles (`.deb`, `.AppImage`, `.rpm`). The
Windows toolchain (`.bat`/`.ps1`, `api.exe`) is not used here.

## 1. One-time machine setup

```bash
bash apps/desktop/scripts/setup-linux.sh
```

Installs: `libwebkit2gtk-4.1-dev`, `build-essential`, `libxdo-dev`,
`libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `pkg-config`,
the Rust toolchain (via rustup), and PyInstaller.

Open a new shell afterwards so `~/.cargo/env` is on `PATH`
(`rustc --version` should work).

## 2. Build

```bash
bun install
bun run desktop:build:linux
```

This runs two steps:

1. `apps/desktop/scripts/build-sidecar.sh` — PyInstaller bundles
   `apps/api/app.py` into `apps/desktop/src-tauri/bin/api-<host-triple>`
   (e.g. `api-x86_64-unknown-linux-gnu`). Tauri resolves sidecars by host
   target triple, so the name matters and there is **no `.exe`** suffix.
2. `tauri build` — compiles the Rust shell, runs `beforeBuildCommand`
   (web build via `cross-env`), and produces the bundles.

Output bundles:

```
apps/desktop/src-tauri/target/release/bundle/deb/*.deb
apps/desktop/src-tauri/target/release/bundle/appimage/*.AppImage
```

## 3. Smoke-test the sidecar in isolation (recommended before bundling)

PyInstaller `--onefile` can miss dynamic imports from LangChain / provider
SDKs. Verify the frozen backend boots before trusting the packaged app:

```bash
./apps/desktop/src-tauri/bin/api-x86_64-unknown-linux-gnu &
curl http://127.0.0.1:5000/health     # expect HTTP 200
```

If it fails with `ModuleNotFoundError`, add the missing module as another
`--hidden-import` / `--collect-all` in `scripts/build-sidecar.sh`.

## Linux IME input

QurioDB enables WebKitGTK input-method preedit on the main Tauri webview.
This keeps IME composition rendered inline in Monaco and in normal form
inputs. The configuration is in `src-tauri/src/lib.rs`.

Do not replace this configuration with `WEBKIT_DISABLE_COMPOSITING_MODE`.
That environment variable changes rendering behavior; it does not configure
Wry's preedit policy.

When collecting a Linux IME report, run these diagnostics (they print only
session and input-method names/values, not secret contents):

```bash
printf 'session=%s\n' "$XDG_SESSION_TYPE"
printf 'GTK_IM_MODULE=%s\n' "${GTK_IM_MODULE-}"
printf 'QT_IM_MODULE=%s\n' "${QT_IM_MODULE-}"
printf 'XMODIFIERS=%s\n' "${XMODIFIERS-}"
pkg-config --modversion webkit2gtk-4.1
ibus engine 2>/dev/null || true
fcitx5-remote -n 2>/dev/null || true
```

Test both SQL Lab (including Monaco composition) and a normal search input.
State whether each result came from development mode, a `.deb`, or an
`.AppImage` package. Do not mark Wayland/X11 or IBus/Fcitx GUI rows as passed
unless they were observed interactively; otherwise report them as
`UNTESTED`.

## Notes

- The backend binds `127.0.0.1:5000`; the Rust shell health-polls
  `/health` and emits `backend-ready` (see `src-tauri/src/lib.rs`).
- `apps/api/.env` must exist — it is bundled as a Tauri resource
  (`tauri.conf.json` → `bundle.resources`).
- `apps/desktop/python/` (pywebview + `DBMS_Platform.spec`) is the legacy
  Windows packaging path and is **not** used by the Tauri build.
- Rebuild the sidecar (`bun run desktop:sidecar:linux`) whenever you change
  `apps/api/` Python, or the packaged app keeps running a stale binary.
```
