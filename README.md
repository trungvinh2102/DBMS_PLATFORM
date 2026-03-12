# DBMS Platform

A modern, high-performance Database Management System platform built with a Next.js frontend, Flask backend, and cross-platform Desktop support.

## 🚀 Quick Launch

This project includes localized scripts for easy startup:

- **Web Browser Version**: Double-click `run-web.bat` to launch the API and open the web interface.
- **Desktop Application**: Double-click `run-desktop.bat` to launch the standalone desktop app.

---

## 💻 Desktop Application (.exe)

The desktop app is built with Electron and includes an embedded Python API sidecar for offline capabilities.

### 📥 [Download Installer Directly](https://github.com/trungvinh2102/DBMS_PLATFORM/releases/latest/download/DBMS_Platform.exe)

> [!IMPORTANT]
> Click the link above to download the official `.exe` installer from the Releases page.

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

- **Frontend (`apps/web`)**: Next.js 15, TailwindCSS, shadcn/ui, TanStack Query.
- **Backend (`apps/api`)**: Flask (Python), PostgreSQL, SQLAlchemy.
- **Desktop (`apps/desktop`)**: Electron wrapper with automated backend lifecycle management.

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

The platform uses PostgreSQL. You can start a local instance using Docker or use an existing one.

1. **Start PostgreSQL Container**:

   ```bash
   bun run db:start
   ```

2. **Configure Environment**:
   Create or update `apps/api/.env` with your connection string:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/dbms_platform"
   ```

3. **Initialize Database & Tables**:
   Run the setup script to create the database and all necessary tables:

   ```bash
   python apps/api/scripts/setup_db.py
   ```

4. **Seed Initial Data (Recommended)**:
   Add default roles and a test user (username: `admin` / password: `password123`):
   ```bash
   python apps/api/scripts/seed.py
   ```

### 4. Running in Development

```bash
# Start everything (Web + Desktop + API)
bun run dev

# Start only the Backend
bun run backend:dev
```

---

## 🌐 Environment Configuration

The application is configured to handle multiple environments (Local, Desktop, Production) automatically.
To customize the API target, use the `NEXT_PUBLIC_API_URL` environment variable during build.

---

## 📄 License

Internal Development - DBMS Platform Team.
