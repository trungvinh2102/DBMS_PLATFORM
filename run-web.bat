@echo off
setlocal
echo Starting DBMS Platform Web...
echo ============================

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH.
    pause
    exit /b 1
)

:: Check for Bun
bun --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Bun is not installed or not in PATH.
    pause
    exit /b 1
)

echo Starting Backend API...
start "Backend API" cmd /c "bun run backend:dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting Web Frontend...
start "" "http://localhost:3001"
bun run web:standalone

echo DBMS Platform Web is ending.
pause
