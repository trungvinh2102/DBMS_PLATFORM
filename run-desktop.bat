@echo off
setlocal
echo Starting DBMS Platform Desktop...
echo =================================

:: 1. Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Docker is not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo [WAIT] Waiting for Docker to initialize (30-60s)...
    :wait_docker
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 5 /nobreak >nul
        goto wait_docker
    )
    echo [SUCCESS] Docker is ready!
)

:: 2. Start Database
echo [INFO] Starting Database via Docker Compose...
docker compose up -d

:: 3. Check & Start Backend (if not already running on port 5000)
netstat -ano | findstr :5000 >nul
if %errorlevel% neq 0 (
    echo [INFO] Starting Backend API...
    start "Backend API" cmd /c "bun run backend:dev"
    timeout /t 5 /nobreak >nul
) else (
    echo [INFO] Backend is already running.
)

:: 4. Start Desktop App
echo [INFO] Launching Desktop App...
bun run desktop:standalone

pause

