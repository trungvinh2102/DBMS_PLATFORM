# DBMS Platform - Desktop Build Guide

This directory contains the **Tauri** desktop wrapper for the DBMS Platform. It bundles the Next.js frontend and the Python Flask backend into a single standalone executable.

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
3.  Builds the Next.js frontend in static export mode.
4.  Compiles the Rust Tauri wrapper and bundles everything into an installer.

### 3. Build Components Manually (Advanced)

If you need more control, you can build parts separately:

#### A. Build Backend Sidecar

```powershell
./build-backend.ps1
```

#### B. Build Tauri App

```bash
powershell -ExecutionPolicy Bypass -File build-backend.ps1 && export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu && export PATH="/c/ProgramData/mingw64/mingw64/bin:$PATH" && cd apps/desktop && bun run tauri build --target x86_64-pc-windows-gnu
```

## 📂 Output Locations

After a successful build, you can find the installers here:

- **MSI Installer**: `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/msi/`
- **NSIS (.exe) Setup**: `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/`

## ⚙️ Configuration Notes

- **Sidecars**: Configured in `tauri.conf.json` under `bundle.externalBin`.
- **Resources**: The `.env` file is included via the `bundle.resources` array.
- **Icon**: Managed in `src-tauri/icons/`.

---

_DBMS Platform Team - v0.1.2_
