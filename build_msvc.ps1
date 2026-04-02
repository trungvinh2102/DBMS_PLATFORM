$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-msvc"
powershell -ExecutionPolicy Bypass -File build-backend.ps1 -Target msvc
# Use bun x turbo to ensure turbo is found.
bun x turbo run build --filter=desktop
