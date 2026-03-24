@echo off
setlocal

:: Determine target triple
set TARGET_TRIPLE=x86_64-pc-windows-msvc

echo ===========================================
echo Building Python Backend Sidecar for %TARGET_TRIPLE%
echo ===========================================

:: Path to API
set API_DIR=..\..\apps\api
set DEST_DIR=..\src-tauri\bin

:: Install dependencies
echo [1/4] Installing Python dependencies...
cd %API_DIR%
pip install -r requirements.txt --quiet
pip install pyinstaller --quiet

:: Build with PyInstaller
echo [2/4] Running PyInstaller...
if exist "api-%TARGET_TRIPLE%.spec" (
    echo Using existing spec file...
    pyinstaller "api-%TARGET_TRIPLE%.spec" --noconfirm
) else (
    echo Using default options...
    pyinstaller --onefile --name api-%TARGET_TRIPLE% app.py --noconfirm
)

:: Move to Tauri bin directory
echo [3/4] Copying binary...
if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"
copy /Y dist\api-%TARGET_TRIPLE%.exe %DEST_DIR%\api-%TARGET_TRIPLE%.exe

echo [4/4] Done!
echo Output: %DEST_DIR%\api-%TARGET_TRIPLE%.exe
cd ..\..\apps\desktop\scripts
