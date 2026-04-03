# DBMS Platform

A modern, high-performance Database Management System platform built with a ReactJS frontend, Flask backend, and cross-platform Desktop support.

## 🚀 Quick Launch

This project includes localized scripts for easy startup:

- **Web Browser Version**: Double-click `run-web.bat` to launch the API and open the web interface.
- **Desktop Application**: Double-click `run-desktop.bat` to launch the standalone desktop app.

---

## 💻 Desktop Application (.msi)

The desktop app is built with **Tauri** and includes an embedded Python API sidecar for offline capabilities.

### 📥 [Download Installer Directly (v1.0.0)](https://github.com/trungvinh2102/DBMS_PLATFORM/releases/download/1.0.0/DBMS.Platform_1.0.0_x64_en-US.msi)

> [!TIP]
> This link points to the current stable release. To download the very latest official version, visit the [Releases Page](https://github.com/trungvinh2102/DBMS_PLATFORM/releases).

### 🏗️ Build from Source

To generate a fresh `.msi` installer:

1. Ensure all dependencies are installed: `bun install`
2. Run the distribution command:
   ```bash
   bun run desktop:dist
   ```
3. The setup file will be generated in `apps/desktop/dist/`.

---

## 🛠️ Architecture

- **Frontend (`apps/web`)**: ReactJS 19, TailwindCSS, shadcn/ui, TanStack Query.
- **Backend (`apps/api`)**: Flask (Python), SQLite (System DB), SQLAlchemy.
- **Desktop (`apps/desktop`)**: Tauri wrapper with automated backend lifecycle management.

---

## ⚙️ Setup & Development

### 1. Requirements

- **Bun** (Runtime)
- **Python 3.10+** (Backend)

### 2. Installation

```bash
bun install
pip install -r apps/api/requirements.txt
```

### 3. Database Setup

The platform uses **SQLite** automatically for its internal system metadata. 

#### A. Zero-Config Startup
When you run the app for the first time, it will automatically create a local database file:
- **Windows**: `%APPDATA%\DBMSPlatform\dbms_platform.db`
- **Linux/macOS**: `~/.dbms_platform/dbms_platform.db`

No external database installation (like Docker or Postgres) is required for the application to function.

#### B. Initialize & Seed (Optional)
The system initializes tables on first run. If you want to seed default data:
1. **Seed Admin User**:
   ```bash
   python apps/api/scripts/seed.py
   ```
   *Default Admin: `admin` / `password123`*

### 4. Running in Development

```bash
# Start everything (Web + Desktop + API)
bun run dev

# Start only the Backend
bun run backend:dev
```

### 5. Desktop Sidebar Sync (Crucial)

If you modify the Python code in `apps/api/` and want those changes to reflect in the **Desktop version**, you **must rebuild the sidecar**:

```powershell
# Run from the root directory
powershell -ExecutionPolicy Bypass -File build-backend.ps1
```

Failing to do this will cause the Desktop app to continue running the old `api.exe` binary.

---

## 🌐 Environment Configuration

The application is configured to handle multiple environments (Local, Desktop, Production) automatically.
To customize the API target, use the `NEXT_PUBLIC_API_URL` environment variable during build.

---

## 📄 License

Internal Development - DBMS Platform Team.

---
*DBMS Platform Team - v0.1.2*
