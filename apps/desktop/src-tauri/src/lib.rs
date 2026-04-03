//! @file lib.rs
//! @description Main Tauri application setup. Manages the backend sidecar
//! lifecycle (spawn, health-check, graceful shutdown) and configures
//! the WebView window.

use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, Emitter, RunEvent, WindowEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

/// Maximum number of health-check attempts before giving up.
/// Increased to 180 (90 seconds) to allow time for Docker Desktop to start.
const HEALTH_CHECK_MAX_RETRIES: u32 = 180;

/// Delay between each health-check attempt (in milliseconds).
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;

/// Port on which the backend API listens.
const BACKEND_PORT: u16 = 5000;

/// Shared state to hold the backend sidecar child process handle.
struct SidecarState(Mutex<Option<CommandChild>>);

/// Performs a blocking health-check against the backend's `/health` endpoint.
/// Returns `true` once the backend responds with HTTP 200.
async fn wait_for_backend_ready() -> bool {
    let url = format!("http://127.0.0.1:{}/health", BACKEND_PORT);

    for attempt in 1..=HEALTH_CHECK_MAX_RETRIES {
        match reqwest::get(&url).await {
            Ok(resp) if resp.status().is_success() => {
                log::info!("Backend ready after {} attempts", attempt);
                return true;
            }
            _ => {
                log::debug!("Health check attempt {}/{} failed, retrying...", attempt, HEALTH_CHECK_MAX_RETRIES);
                tokio::time::sleep(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS)).await;
            }
        }
    }

    log::error!("Backend failed to start after {} attempts", HEALTH_CHECK_MAX_RETRIES);
    false
}

/// Spawns the Python backend sidecar using Tauri's shell plugin API.
/// Returns the `CommandChild` handle for lifecycle management.
fn spawn_backend_sidecar(app: &tauri::AppHandle) -> Result<CommandChild, String> {
    let shell = app.shell();

    let (mut rx, child) = shell
        .sidecar("api")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Forward sidecar stdout/stderr to application logs
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    log::info!("[Backend] {}", text.trim());
                }
                CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    log::warn!("[Backend] {}", text.trim());
                }
                CommandEvent::Terminated(payload) => {
                    log::warn!("[Backend] Process terminated with code: {:?}, signal: {:?}", payload.code, payload.signal);
                }
                _ => {}
            }
        }
    });

    Ok(child)
}

/// Gracefully shuts down the backend sidecar process.
fn shutdown_sidecar(state: &SidecarState) {
    let mut guard = state.0.lock().unwrap();
    if let Some(child) = guard.take() {
        let pid = child.pid();
        log::info!("Shutting down backend sidecar (PID: {})...", pid);

        #[cfg(windows)]
        {
            // On Windows, use taskkill to ensure the entire process tree is terminated
            let _ = std::process::Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .spawn();
            log::info!("Sent taskkill command to process tree.");
        }

        #[cfg(not(windows))]
        {
            if let Err(e) = child.kill() {
                log::error!("Failed to kill sidecar process: {}", e);
            }
        }
        
        log::info!("Backend sidecar shutdown command issued.");
    }
}

/// Application entry point. Configures Tauri with plugins, spawns the
/// backend sidecar, and registers lifecycle handlers.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                // Spawn the backend sidecar
                match spawn_backend_sidecar(&handle) {
                    Ok(child) => {
                        // Store child handle for graceful shutdown
                        let state = handle.state::<SidecarState>();
                        *state.0.lock().unwrap() = Some(child);

                        // Wait for backend to be ready
                        if wait_for_backend_ready().await {
                            // Emit event to frontend so it knows the backend is available
                            let _ = handle.emit("backend-ready", true);
                            log::info!("Backend-ready event emitted to frontend.");
                        } else {
                            let _ = handle.emit("backend-ready", false);
                            log::error!("Backend did not become ready in time.");
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to start backend: {}", e);
                        let _ = handle.emit("backend-ready", false);
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                // Graceful shutdown when user closes the window
                RunEvent::WindowEvent {
                    event: WindowEvent::CloseRequested { .. },
                    ..
                } => {
                    let state = app_handle.state::<SidecarState>();
                    shutdown_sidecar(&state);
                }
                // Also handle the final Exit event as a safety net
                RunEvent::Exit => {
                    let state = app_handle.state::<SidecarState>();
                    shutdown_sidecar(&state);
                }
                _ => {}
            }
        });
}
