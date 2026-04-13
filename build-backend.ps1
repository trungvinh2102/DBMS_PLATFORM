# Build script for packaging the Python Flask backend as a sidecar executable.
# Supports both x86_64-pc-windows-gnu and x86_64-pc-windows-msvc targets.
#
# Usage:
#   ./build-backend.ps1                    # Builds for gnu target (default)
#   ./build-backend.ps1 -Target msvc       # Builds for msvc target

param(
    [ValidateSet("gnu", "msvc")]
    [string]$Target = "gnu"
)

$ErrorActionPreference = "Stop"

$TARGET_TRIPLE = if ($Target -eq "msvc") {
    "x86_64-pc-windows-msvc"
} else {
    "x86_64-pc-windows-gnu"
}

Write-Host "=== Building Python Backend Sidecar for $TARGET_TRIPLE ===" -ForegroundColor Cyan

$API_DIR = "apps/api"
$DEST_DIR = "apps/desktop/src-tauri/bin"

# Install dependencies
Write-Host "[1/4] Installing Python dependencies..." -ForegroundColor Yellow
Set-Location $API_DIR
& ./venv/Scripts/python -m pip install -r requirements.txt --quiet
& ./venv/Scripts/python -m pip install pyinstaller --quiet

# Build with PyInstaller
Write-Host "[2/4] Running PyInstaller..." -ForegroundColor Yellow
$SPEC_FILE = "specs/api-$TARGET_TRIPLE.spec"

if (Test-Path $SPEC_FILE) {
    Write-Host "Using existing spec file: $SPEC_FILE"
    & ./venv/Scripts/python -m PyInstaller $SPEC_FILE --noconfirm
} else {
    Write-Host "No spec file found, building with default options..."
    & ./venv/Scripts/python -m PyInstaller --onefile --noconsole --name "api-$TARGET_TRIPLE" app.py --noconfirm
}

# Create destination directory
Write-Host "[3/4] Copying binary..." -ForegroundColor Yellow
if (-not (Test-Path "../../$DEST_DIR")) {
    New-Item -ItemType Directory -Path "../../$DEST_DIR" -Force | Out-Null
}

# Copy the built executable
Copy-Item "dist/api-$TARGET_TRIPLE.exe" "../../$DEST_DIR/api-$TARGET_TRIPLE.exe" -Force

Write-Host "[4/4] Done!" -ForegroundColor Green
Write-Host "Output: $DEST_DIR/api-$TARGET_TRIPLE.exe" -ForegroundColor Green

# Return to original directory
Set-Location ../..
