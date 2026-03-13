@echo off
setlocal

:: Determine target triple
set TARGET_TRIPLE=x86_64-pc-windows-msvc

echo Building Python Backend Sidecar for %TARGET_TRIPLE%...

:: Path to API
set API_DIR=../../apps/api
set DEST_DIR=../src-tauri/bin

:: Install dependencies
cd %API_DIR%
pip install -r requirements.txt
pip install pyinstaller

:: Build with PyInstaller
:: --onefile: bundle into a single executable
:: --name: naming it for Tauri sidecar
pyinstaller --onefile --name api-%TARGET_TRIPLE% app.py

:: Move to Tauri bin directory
if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
copy /Y dist\api-%TARGET_TRIPLE%.exe %DEST_DIR%\api-%TARGET_TRIPLE%.exe

echo Backend sidecar built and copied to %DEST_DIR%
cd ../desktop
