@echo off
setlocal
echo Starting DBMS Platform Desktop (Tauri Dev Mode)...
echo ===============================================

:: 1. Build Backend Sidecar (if needed)
echo [1/3] Checking Backend Sidecar...
if not exist "apps\desktop\src-tauri\bin\api-x86_64-pc-windows-msvc.exe" (
    echo [INFO] Sidecar not found. Building...
    powershell -ExecutionPolicy Bypass -File build-backend.ps1
)

:: 2. Run Tauri in Dev Mode
echo [2/3] Starting Tauri...
cd apps\desktop
bun run dev

echo Done.
pause
