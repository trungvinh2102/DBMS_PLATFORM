#!/usr/bin/env bash
#
# Build the Python backend as a Tauri sidecar binary on Linux/macOS.
#
# Tauri resolves sidecars by the host's Rust target triple, so the binary
# must be named bin/api-<triple> (e.g. bin/api-x86_64-unknown-linux-gnu) —
# no .exe suffix on Linux. See apps/desktop/scripts/build-sidecar.bat for
# the Windows equivalent.
set -euo pipefail

# --- Resolve paths (script may be invoked from anywhere) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
DEST_DIR="$DESKTOP_DIR/src-tauri/bin"

# --- Resolve host target triple ---
if command -v rustc >/dev/null 2>&1; then
  TARGET_TRIPLE="$(rustc -Vv | sed -n 's/^host: //p')"
else
  echo "error: rustc not found — install Rust (https://rustup.rs) first." >&2
  exit 1
fi

PYTHON="${PYTHON:-python3}"

echo "==========================================="
echo "Building Python backend sidecar"
echo "  target triple : $TARGET_TRIPLE"
echo "  api dir       : $API_DIR"
echo "  dest          : $DEST_DIR/api-$TARGET_TRIPLE"
echo "==========================================="

cd "$API_DIR"

echo "[1/4] Installing Python dependencies..."
"$PYTHON" -m pip install -r requirements.txt --quiet
"$PYTHON" -m pip install pyinstaller --quiet

echo "[2/4] Running PyInstaller..."
SPEC_FILE="$API_DIR/specs/api-$TARGET_TRIPLE.spec"
if [ -f "$SPEC_FILE" ]; then
  # The spec already encodes name, --onefile, hidden imports, and the
  # --collect-all bundling — PyInstaller ignores build flags when given a
  # spec, so pass it alone (the spec is the single source of truth).
  echo "Using spec file: $SPEC_FILE"
  "$PYTHON" -m PyInstaller "$SPEC_FILE" --noconfirm --clean
else
  # Fallback when no spec exists for this triple. --collect-all pulls in data
  # files + hidden imports for packages PyInstaller's static analysis misses
  # (LangChain providers, uvicorn, etc.).
  echo "No spec for $TARGET_TRIPLE — building from CLI flags."
  "$PYTHON" -m PyInstaller \
    --onefile \
    --name "api-$TARGET_TRIPLE" \
    --noconfirm \
    --clean \
    --hidden-import="uvicorn.logging" \
    --hidden-import="uvicorn.loops.auto" \
    --hidden-import="uvicorn.protocols.http.auto" \
    --hidden-import="uvicorn.protocols.websockets.auto" \
    --hidden-import="uvicorn.lifespan.on" \
    --collect-all="langchain" \
    --collect-all="langchain_core" \
    --collect-all="langchain_openai" \
    --collect-all="langchain_anthropic" \
    --collect-all="langchain_google_genai" \
    --collect-all="langgraph" \
    app.py
fi

echo "[3/4] Copying binary..."
mkdir -p "$DEST_DIR"
cp -f "dist/api-$TARGET_TRIPLE" "$DEST_DIR/api-$TARGET_TRIPLE"
chmod +x "$DEST_DIR/api-$TARGET_TRIPLE"

echo "[4/4] Done."
echo "Output: $DEST_DIR/api-$TARGET_TRIPLE"
echo
echo "Smoke-test the sidecar directly with:"
echo "  \"$DEST_DIR/api-$TARGET_TRIPLE\" &"
echo "  curl http://127.0.0.1:5000/health"
