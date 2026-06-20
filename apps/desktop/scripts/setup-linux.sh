#!/usr/bin/env bash
#
# Install the system toolchain required to build the QurioDB Tauri desktop
# app on Debian/Ubuntu. Run once per machine. Safe to re-run.
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "error: this script targets Debian/Ubuntu (apt). For other distros, install" >&2
  echo "       the equivalents of: webkit2gtk 4.1, gtk3, libsoup3, ayatana appindicator," >&2
  echo "       librsvg2, libxdo, openssl, pkg-config, plus Rust and PyInstaller." >&2
  exit 1
fi

echo "[1/3] Installing Tauri system dependencies (sudo required)..."
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  pkg-config

echo "[2/3] Installing Rust toolchain..."
if command -v rustc >/dev/null 2>&1; then
  echo "  rustc already present: $(rustc --version)"
else
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi

echo "[3/3] Installing PyInstaller (for the backend sidecar)..."
"${PYTHON:-python3}" -m pip install --user pyinstaller

echo
echo "Done. Open a new shell (so ~/.cargo/env is loaded), then build with:"
echo "  bun run desktop:build:linux"
