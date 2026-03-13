$ErrorActionPreference = "Stop"

$TARGET_TRIPLE = "x86_64-pc-windows-gnu"
Write-Host "Building Python Backend Sidecar for $TARGET_TRIPLE..."

$API_DIR = "apps/api"
$DEST_DIR = "apps/desktop/src-tauri/bin"

# Install dependencies
Set-Location $API_DIR
& pip install -r requirements.txt
& pip install pyinstaller

# Build with PyInstaller using the existing SPEC file
Write-Host "Running PyInstaller with spec file..."
& pyinstaller "api-$TARGET_TRIPLE.spec" --noconfirm

# Create destination directory if it doesn't exist
if (-not (Test-Path $DEST_DIR)) {
    New-Item -ItemType Directory -Path $DEST_DIR -Force
}

# Move to Tauri bin directory
Write-Host "Copying binary to $DEST_DIR..."
Copy-Item "dist/api-$TARGET_TRIPLE.exe" "../../$DEST_DIR/api-$TARGET_TRIPLE.exe" -Force

Write-Host "Backend sidecar built successfully!"
