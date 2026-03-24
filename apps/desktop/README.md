# DBMS Platform - Desktop Build Guide

This directory contains the **Tauri 2** desktop wrapper for the DBMS Platform. It bundles the Vite/React frontend and the Python Flask backend into a standalone Windows installer (.exe).

## 🏛 Architecture

```
┌──────────────────────────────────────────┐
│          Tauri Desktop Application       │
│                                          │
│  ┌────────────┐    ┌──────────────────┐  │
│  │  WebView   │    │ Backend Sidecar  │  │
│  │ (Vite/     │◄──►│ (api.exe via     │  │
│  │  React)    │    │  PyInstaller)    │  │
│  └────────────┘    └──────────────────┘  │
│                                          │
│  Lifecycle: spawn → health-check → run   │
│  Shutdown:  CloseRequested → kill child  │
└──────────────────────────────────────────┘
```

## 🛠 Prerequisites

Ensure you have the following installed on your Windows system:

1.  **Rust & Cargo**: Follow instructions at [rustup.rs](https://rustup.rs/).
2.  **MingW-w64**: Required for the `x86_64-pc-windows-gnu` target.
3.  **Bun**: For frontend build and task orchestration.
4.  **Python 3.7+**: For building the backend sidecar.
5.  **Tauri CLI**: `bun install -g @tauri-apps/cli`

## 🏗 Build Flow

The build process is semi-automated using a main PowerShell script at the root of the repository.

### 1. Configure the Backend Environment

Ensure `apps/api/.env` exists and contains your production settings (like `DATABASE_URL`). This file will be bundled into the application.

### 2. Build the Entire Package (Recommended)

Run the following command from the **root directory** of the project:

```powershell
# Using the distribution script
bun run desktop:dist
```

This command performs the following steps:

1.  Packages the Python API using PyInstaller (via `build-backend.ps1`).
2.  Copies the resulting `api.exe` to `apps/desktop/src-tauri/bin/`.
3.  Builds the Vite/React frontend (`vite build → dist/`).
4.  Compiles the Rust Tauri wrapper and bundles everything into an installer.

### 3. Build Components Manually (Advanced)

If you need more control, you can build parts separately:

#### A. Build Backend Sidecar

```powershell
# Default (GNU target)
./build-backend.ps1

# Or specify MSVC target
./build-backend.ps1 -Target msvc
```

#### B. Build Tauri App

```bash
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu
export PATH="/c/ProgramData/mingw64/mingw64/bin:$PATH"
cd apps/desktop
bun run tauri build --target x86_64-pc-windows-gnu
```

## 📂 Output Locations

After a successful build, you can find the installers here:

- **MSI Installer**: `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/msi/`
- **NSIS (.exe) Setup**: `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/`

## ⚙️ Configuration Notes

- **Sidecars**: Configured in `tauri.conf.json` under `bundle.externalBin`.
- **Resources**: The `.env` file is included via the `bundle.resources` array.
- **Icon**: The desktop app uses the system's DBMS Platform logo (database icon). Icons are managed in `src-tauri/icons/` and generated using `npx @tauri-apps/cli icon <source.png>`.

## 🔧 Key Behaviors

### Backend Sidecar Lifecycle

When the desktop app starts:
1. **Spawn**: The Tauri Rust core spawns `api.exe` via `tauri-plugin-shell`.
2. **Health Check**: Polls `http://127.0.0.1:5000/health` every 500ms (up to 30 attempts).
3. **Ready Event**: Emits `backend-ready` event to the frontend once the backend is live.
4. **Graceful Shutdown**: On window close, the sidecar process is killed to prevent orphans.

### Security

- Backend binds to `127.0.0.1` (not `0.0.0.0`) to avoid Windows firewall popups.
- Use `FLASK_HOST=0.0.0.0` environment variable to override for web deployments.

### ⚠️ Stale Sidecars (Developer Warning)

When developing the desktop app, Tauri **always** uses the pre-built `api.exe` binaries located in `src-tauri/bin/`. 

If you make any changes to the Python code in `apps/api/`, those changes **will not take effect** in the desktop app until you manually rebuild the sidecar using:
- `./build-backend.ps1` (from the root)
- Or running `run-desktop.bat` from the root.

---

_DBMS Platform Team - v0.1.3_
