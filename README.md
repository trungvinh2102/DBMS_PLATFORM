# DBMS Platform

A modern, high-performance Database Management System platform built with a ReactJS frontend, Flask backend, and cross-platform Desktop support.

## 🚀 Quick Launch

This project includes localized scripts for easy startup:

- **Web Browser Version**: Double-click `run-web.bat` to launch the API and open the web interface.
- **Desktop Application**: Double-click `run-desktop.bat` to launch the standalone desktop app.

---

## 💻 Desktop Application (.exe)

The desktop app is built with **Tauri** and includes an embedded Python API sidecar for offline capabilities.

### 📥 [Download Installer Directly (v0.1.2)](https://github.com/trungvinh2102/DBMS_PLATFORM/releases/download/0.1.2/DBMS_Platform.exe)

> [!TIP]
> This link points to the current stable release. To download the very latest official version, visit the [Releases Page](https://github.com/trungvinh2102/DBMS_PLATFORM/releases).

### 🏗️ Build from Source

To generate a fresh `.exe` installer:

1. Ensure all dependencies are installed: `bun install`
2. Run the distribution command:
   ```bash
   bun run desktop:dist
   ```
3. The setup file will be generated in `apps/desktop/dist/`.

---

## 🛠️ Architecture

- **Frontend (`apps/web`)**: ReactJS 19, TailwindCSS, shadcn/ui, TanStack Query.
- **Backend (`apps/api`)**: Flask (Python), PostgreSQL, SQLAlchemy.
- **Desktop (`apps/desktop`)**: Tauri wrapper with automated backend lifecycle management.

---

## ⚙️ Setup & Development

### 1. Requirements

- **Bun** (Runtime)
- **Python 3.10+** (Backend)
- **Docker** (For PostgreSQL)

### 2. Installation

```bash
bun install
pip install -r apps/api/requirements.txt
```

### 3. Database Setup

The platform requires a PostgreSQL database. Follow these steps to set it up:

#### A. Using Docker (Recommended)
If you have Docker installed, you can use the provided configuration:
1. **Download/Copy** the [docker-compose.yml](https://github.com/trungvinh2102/DBMS_PLATFORM/blob/dev1.0/docker-compose.yml) file to your server.
2. Run the following command to start the database:
   ```bash
   docker compose up -d
   ```

#### B. Configure Environment
Create an `.env` file in `apps/api/` (or next to the `.exe` for desktop users) with your connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/dbms_platform"
```

#### C. Initialize & Seed (For Developers)
If you are running from source, initialize the schema and default data:
1. **Create Tables**:
   ```bash
   python apps/api/scripts/setup_db.py
   ```
2. **Seed Admin User**:
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
