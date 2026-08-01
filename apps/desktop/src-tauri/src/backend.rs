//! Backend sidecar lifecycle and public desktop backend state.

use rand::{rngs::OsRng, RngCore};
use serde::Serialize;
use std::net::TcpListener;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::sync::oneshot;

pub const HEALTH_CHECK_MAX_RETRIES: u32 = 180;
pub const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
pub const BACKEND_STATUS_EVENT: &str = "backend-status-changed";
const DESKTOP_PORT_ENV: &str = "QURIODB_DESKTOP_PORT";
const DESKTOP_NONCE_ENV: &str = "QURIODB_STARTUP_NONCE";
const DESKTOP_PARENT_PID_ENV: &str = "QURIODB_DESKTOP_PARENT_PID";

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum BackendErrorCode {
    SpawnFailed,
    SidecarExited,
    ReadinessTimeout,
    IdentityMismatch,
    RestartFailed,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum BackendStatus {
    Starting {
        generation: u64,
    },
    Ready {
        generation: u64,
        #[serde(rename = "apiBaseUrl")]
        api_base_url: String,
    },
    Failed {
        generation: u64,
        #[serde(rename = "errorCode")]
        error_code: BackendErrorCode,
    },
}

struct BackendRuntime {
    generation: u64,
    status: BackendStatus,
    child: GenerationSlot<CommandChild>,
}

pub struct BackendManager(Mutex<BackendRuntime>);

struct GenerationOwned<T> {
    generation: u64,
    value: T,
}

struct GenerationSlot<T> {
    value: Option<GenerationOwned<T>>,
}

impl<T> Default for GenerationSlot<T> {
    fn default() -> Self {
        Self { value: None }
    }
}

impl<T> GenerationSlot<T> {
    fn replace_if_generation(
        &mut self,
        current_generation: u64,
        generation: u64,
        value: T,
    ) -> Result<Option<T>, T> {
        if current_generation != generation {
            return Err(value);
        }

        Ok(self
            .value
            .replace(GenerationOwned { generation, value })
            .map(|owned| owned.value))
    }

    fn take_if_generation(&mut self, current_generation: u64, generation: u64) -> Option<T> {
        if current_generation != generation {
            return None;
        }

        self.value
            .take()
            .filter(|owned| owned.generation == generation)
            .map(|owned| owned.value)
    }

    fn take_current(&mut self) -> Option<T> {
        self.value.take().map(|owned| owned.value)
    }

    fn invalidate_and_take(&mut self, current_generation: &mut u64) -> Option<T> {
        *current_generation += 1;
        self.take_current()
    }
}

impl Default for BackendManager {
    fn default() -> Self {
        Self(Mutex::new(BackendRuntime {
            generation: 0,
            status: BackendStatus::Starting { generation: 0 },
            child: GenerationSlot::default(),
        }))
    }
}

impl BackendManager {
    pub fn begin_generation(&self) -> u64 {
        let mut runtime = self.0.lock().expect("backend state mutex poisoned");
        runtime.generation += 1;
        let generation = runtime.generation;
        runtime.status = BackendStatus::Starting { generation };
        generation
    }

    pub fn status(&self) -> BackendStatus {
        self.0
            .lock()
            .expect("backend state mutex poisoned")
            .status
            .clone()
    }

    pub fn mark_ready(&self, generation: u64, api_base_url: String) -> Option<BackendStatus> {
        let mut runtime = self.0.lock().expect("backend state mutex poisoned");
        if runtime.generation != generation {
            return None;
        }
        if !matches!(
            runtime.status,
            BackendStatus::Starting {
                generation: status_generation
            } if status_generation == generation
        ) {
            return None;
        }
        let status = BackendStatus::Ready {
            generation,
            api_base_url,
        };
        runtime.status = status.clone();
        Some(status)
    }

    pub fn mark_failed(
        &self,
        generation: u64,
        error_code: BackendErrorCode,
    ) -> Option<BackendStatus> {
        let mut runtime = self.0.lock().expect("backend state mutex poisoned");
        if runtime.generation != generation {
            return None;
        }
        if matches!(runtime.status, BackendStatus::Failed { .. }) {
            return None;
        }
        let status = BackendStatus::Failed {
            generation,
            error_code,
        };
        runtime.status = status.clone();
        Some(status)
    }

    pub fn attach_child(
        &self,
        generation: u64,
        child: CommandChild,
    ) -> Result<Option<CommandChild>, CommandChild> {
        self.replace_child(generation, child)
    }

    pub fn replace_child(
        &self,
        generation: u64,
        child: CommandChild,
    ) -> Result<Option<CommandChild>, CommandChild> {
        let mut runtime = self.0.lock().expect("backend state mutex poisoned");
        let current_generation = runtime.generation;
        runtime
            .child
            .replace_if_generation(current_generation, generation, child)
    }

    pub fn take_child_for_generation(&self, generation: u64) -> Option<CommandChild> {
        let mut runtime = self.0.lock().expect("backend state mutex poisoned");
        let current_generation = runtime.generation;
        runtime
            .child
            .take_if_generation(current_generation, generation)
    }

    /// Invalidates the active generation before taking its child.
    ///
    /// Restart and application shutdown must use this API before killing the
    /// process. A retry can then begin a new generation safely.
    pub fn invalidate_and_take_child(&self) -> Option<CommandChild> {
        let mut runtime = self.0.lock().expect("backend state mutex poisoned");
        runtime.generation += 1;
        runtime.child.take_current()
    }

    pub fn take_current_child(&self) -> Option<CommandChild> {
        self.invalidate_and_take_child()
    }
}

pub fn allocate_loopback_port() -> std::io::Result<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    Ok(listener.local_addr()?.port())
}

pub fn generate_startup_nonce() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn emit_status(app: &AppHandle, status: &BackendStatus) {
    let _ = app.emit(BACKEND_STATUS_EVENT, status);
}

fn transition_snapshot_for_emit(transition: Option<BackendStatus>) -> Option<BackendStatus> {
    transition
}

fn emit_status_transition(app: &AppHandle, transition: Option<BackendStatus>) {
    if let Some(status) = transition_snapshot_for_emit(transition) {
        emit_status(app, &status);
    }
}

fn mark_failed(
    app: &AppHandle,
    manager: &BackendManager,
    generation: u64,
    error_code: BackendErrorCode,
) -> Option<BackendStatus> {
    let transition = manager.mark_failed(generation, error_code);
    emit_status_transition(app, transition.clone());
    transition
}

fn sidecar_stream_closed(manager: &BackendManager, generation: u64) -> Option<BackendStatus> {
    manager.mark_failed(generation, BackendErrorCode::SidecarExited)
}

fn handle_sidecar_exit(
    app: &AppHandle,
    manager: &BackendManager,
    generation: u64,
    terminated_tx: &mut Option<oneshot::Sender<()>>,
) -> Option<BackendStatus> {
    if let Some(sender) = terminated_tx.take() {
        let _ = sender.send(());
    }
    let transition = sidecar_stream_closed(manager, generation);
    emit_status_transition(app, transition.clone());
    manager.take_child_for_generation(generation);
    transition
}

fn kill_child(child: CommandChild) {
    let pid = child.pid();
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .spawn();
    }
    #[cfg(not(windows))]
    {
        if let Err(error) = child.kill() {
            log::error!("Failed to kill backend sidecar (PID {pid}): {error}");
        }
    }
}

pub fn start_backend(app: AppHandle) -> Result<BackendStatus, String> {
    let manager = app.state::<BackendManager>();
    let generation = manager.begin_generation();
    emit_status(&app, &BackendStatus::Starting { generation });
    let port = match allocate_loopback_port() {
        Ok(port) => port,
        Err(error) => {
            mark_failed(&app, &manager, generation, BackendErrorCode::SpawnFailed);
            return Err(error.to_string());
        }
    };
    let nonce = generate_startup_nonce();
    let (mut events, child) = match app
        .shell()
        .sidecar("api")
        .map_err(|error| error.to_string())
        .and_then(|command| {
            command
                .env("DISABLE_AUTH", "true")
                .env(DESKTOP_PORT_ENV, port.to_string())
                .env(DESKTOP_NONCE_ENV, nonce.clone())
                .env(DESKTOP_PARENT_PID_ENV, std::process::id().to_string())
                .spawn()
                .map_err(|error| error.to_string())
        }) {
        Ok(result) => result,
        Err(error) => {
            mark_failed(&app, &manager, generation, BackendErrorCode::SpawnFailed);
            return Err(error);
        }
    };

    match manager.attach_child(generation, child) {
        Ok(Some(previous)) => kill_child(previous),
        Ok(None) => {}
        Err(stale_child) => kill_child(stale_child),
    }
    let (terminated_tx, terminated_rx) = oneshot::channel();
    let mut terminated_tx = Some(terminated_tx);
    let event_app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            match events.recv().await {
                Some(CommandEvent::Stdout(line)) => {
                    log::info!("[Backend] {}", String::from_utf8_lossy(&line).trim());
                }
                Some(CommandEvent::Stderr(line)) => {
                    log::warn!("[Backend] {}", String::from_utf8_lossy(&line).trim());
                }
                Some(CommandEvent::Terminated(payload)) => {
                    log::warn!(
                        "[Backend] Process terminated with code: {:?}, signal: {:?}",
                        payload.code,
                        payload.signal
                    );
                    let manager = event_app.state::<BackendManager>();
                    handle_sidecar_exit(&event_app, &manager, generation, &mut terminated_tx);
                    break;
                }
                Some(_) => {}
                None => {
                    let manager = event_app.state::<BackendManager>();
                    handle_sidecar_exit(&event_app, &manager, generation, &mut terminated_tx);
                    break;
                }
            }
        }
    });

    let readiness_app = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = wait_for_backend_ready(port, &nonce, terminated_rx).await;
        let manager = readiness_app.state::<BackendManager>();
        match result {
            Ok(()) => {
                emit_status_transition(
                    &readiness_app,
                    manager.mark_ready(generation, format!("http://127.0.0.1:{port}/api/")),
                );
            }
            Err(error_code) => {
                mark_failed(&readiness_app, &manager, generation, error_code);
            }
        }
    });

    Ok(manager.status())
}

pub fn restart_backend(app: AppHandle) -> Result<BackendStatus, String> {
    let manager = app.state::<BackendManager>();
    shutdown_backend(&manager);
    start_backend(app)
}

pub fn shutdown_backend(manager: &BackendManager) {
    if let Some(child) = manager.invalidate_and_take_child() {
        kill_child(child);
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum HealthProbeResult {
    Ready,
    Pending,
    IdentityMismatch,
}

pub async fn probe_desktop_health(
    client: &reqwest::Client,
    origin: &str,
    nonce: &str,
) -> HealthProbeResult {
    let url = format!("{}/api/desktop/health", origin.trim_end_matches('/'));
    let request = async {
        match client
            .get(url)
            .header("X-QurioDB-Startup-Nonce", nonce)
            .send()
            .await
        {
            Ok(response) if response.status() == reqwest::StatusCode::FORBIDDEN => {
                HealthProbeResult::IdentityMismatch
            }
            Ok(response) if response.status().is_success() => {
                match response.json::<serde_json::Value>().await {
                    Ok(body)
                        if body
                            == serde_json::json!({
                                "status": "ok",
                                "service": "quriodb-desktop"
                            }) =>
                    {
                        HealthProbeResult::Ready
                    }
                    _ => HealthProbeResult::IdentityMismatch,
                }
            }
            _ => HealthProbeResult::Pending,
        }
    };

    match tokio::time::timeout(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS), request).await {
        Ok(result) => result,
        Err(_) => HealthProbeResult::Pending,
    }
}

pub async fn wait_for_backend_ready(
    port: u16,
    nonce: &str,
    mut terminated: oneshot::Receiver<()>,
) -> Result<(), BackendErrorCode> {
    wait_for_backend_ready_with_retries(port, nonce, &mut terminated, HEALTH_CHECK_MAX_RETRIES)
        .await
}

async fn wait_for_backend_ready_with_retries(
    port: u16,
    nonce: &str,
    terminated: &mut oneshot::Receiver<()>,
    max_retries: u32,
) -> Result<(), BackendErrorCode> {
    let client = reqwest::Client::new();
    let origin = format!("http://127.0.0.1:{port}");
    for attempt in 0..max_retries {
        let attempt_deadline =
            tokio::time::Instant::now() + Duration::from_millis(HEALTH_CHECK_INTERVAL_MS);
        tokio::select! {
            biased;
            _ = &mut *terminated => return Err(BackendErrorCode::SidecarExited),
            result = probe_desktop_health(&client, &origin, nonce) => {
                match result {
                    HealthProbeResult::Ready => return Ok(()),
                    HealthProbeResult::IdentityMismatch => {
                        return Err(BackendErrorCode::IdentityMismatch)
                    }
                    HealthProbeResult::Pending => {}
                }
            }
        }

        if attempt + 1 < max_retries {
            let remaining = attempt_deadline.saturating_duration_since(tokio::time::Instant::now());
            tokio::select! {
                _ = &mut *terminated => return Err(BackendErrorCode::SidecarExited),
                _ = tokio::time::sleep(remaining) => {}
            }
        }
    }

    tokio::select! {
        biased;
        _ = &mut *terminated => Err(BackendErrorCode::SidecarExited),
        _ = tokio::task::yield_now() => Err(BackendErrorCode::ReadinessTimeout),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allocates_a_nonzero_loopback_port() {
        let port = allocate_loopback_port().expect("port allocation should succeed");
        assert_ne!(port, 0);
    }

    #[test]
    fn startup_nonce_is_256_bits_encoded_as_hex() {
        let nonce = generate_startup_nonce();
        assert_eq!(nonce.len(), 64);
        assert!(nonce
            .chars()
            .all(|character| character.is_ascii_digit() || ('a'..='f').contains(&character)));
    }

    #[test]
    fn sidecar_spawn_exports_tauri_parent_pid_without_public_logging() {
        let source = include_str!("backend.rs");
        let production_source = source.split("#[cfg(test)]").next().unwrap();
        assert!(production_source
            .contains(".env(DESKTOP_PARENT_PID_ENV, std::process::id().to_string())"));
        assert!(production_source
            .lines()
            .filter(|line| line.contains("DESKTOP_PARENT_PID_ENV"))
            .all(|line| line.contains("const DESKTOP_PARENT_PID_ENV") || line.contains(".env(")));
        let status = serde_json::to_string(&BackendStatus::Starting { generation: 1 }).unwrap();
        assert!(!status.contains("QURIODB_DESKTOP_PARENT_PID"));
    }

    #[test]
    fn stale_generation_cannot_replace_current_status() {
        let manager = BackendManager::default();
        let first = manager.begin_generation();
        let second = manager.begin_generation();
        assert!(manager
            .mark_ready(first, "http://127.0.0.1:41001/api/".into())
            .is_none());
        assert!(manager
            .mark_ready(second, "http://127.0.0.1:41002/api/".into())
            .is_some());
        assert_eq!(
            manager.status(),
            BackendStatus::Ready {
                generation: second,
                api_base_url: "http://127.0.0.1:41002/api/".into(),
            }
        );
    }

    #[test]
    fn stale_failure_cannot_replace_a_newer_ready_generation() {
        let manager = BackendManager::default();
        let first = manager.begin_generation();
        let second = manager.begin_generation();
        assert!(manager
            .mark_ready(second, "http://127.0.0.1:43123/api/".into())
            .is_some());
        assert!(manager
            .mark_failed(first, BackendErrorCode::SidecarExited)
            .is_none());
        assert!(matches!(
            manager.status(),
            BackendStatus::Ready { generation, .. } if generation == second
        ));
    }

    #[test]
    fn failed_generation_rejects_later_ready_transition() {
        let manager = BackendManager::default();
        let generation = manager.begin_generation();
        assert!(manager
            .mark_failed(generation, BackendErrorCode::SidecarExited)
            .is_some());
        assert!(manager
            .mark_ready(generation, "http://127.0.0.1:43123/api/".into())
            .is_none());
        assert_eq!(
            manager.status(),
            BackendStatus::Failed {
                generation,
                error_code: BackendErrorCode::SidecarExited,
            }
        );
    }

    #[test]
    fn post_ready_termination_marks_generation_failed_once() {
        let manager = BackendManager::default();
        let generation = manager.begin_generation();
        assert!(manager
            .mark_ready(generation, "http://127.0.0.1:43123/api/".into())
            .is_some());
        assert!(manager
            .mark_failed(generation, BackendErrorCode::SidecarExited)
            .is_some());
        assert!(manager
            .mark_failed(generation, BackendErrorCode::SidecarExited)
            .is_none());
        assert_eq!(
            manager.status(),
            BackendStatus::Failed {
                generation,
                error_code: BackendErrorCode::SidecarExited,
            }
        );
    }

    #[test]
    fn transition_returns_committed_snapshot_after_manager_advances() {
        let manager = BackendManager::default();
        let generation = manager.begin_generation();
        let snapshot = manager
            .mark_ready(generation, "http://127.0.0.1:43123/api/".into())
            .expect("ready transition should commit");

        let next_generation = manager.begin_generation();

        assert_eq!(
            snapshot,
            BackendStatus::Ready {
                generation,
                api_base_url: "http://127.0.0.1:43123/api/".into(),
            }
        );
        assert_ne!(generation, next_generation);
        assert_eq!(
            snapshot,
            transition_snapshot_for_emit(Some(snapshot.clone())).unwrap()
        );
    }

    #[test]
    fn closed_sidecar_stream_commits_one_sidecar_exited_snapshot() {
        let manager = BackendManager::default();
        let generation = manager.begin_generation();

        let first = sidecar_stream_closed(&manager, generation).expect("close should fail startup");
        let duplicate = sidecar_stream_closed(&manager, generation);

        assert_eq!(
            first,
            BackendStatus::Failed {
                generation,
                error_code: BackendErrorCode::SidecarExited,
            }
        );
        assert!(duplicate.is_none());
        assert_eq!(manager.status(), first);
    }

    #[test]
    fn public_status_serialization_is_camel_case_and_secret_free() {
        let value = serde_json::to_value(BackendStatus::Ready {
            generation: 2,
            api_base_url: "http://127.0.0.1:43123/api/".into(),
        })
        .unwrap();
        assert_eq!(value["status"], "ready");
        assert_eq!(value["generation"], 2);
        assert_eq!(value["apiBaseUrl"], "http://127.0.0.1:43123/api/");
        assert!(value.get("nonce").is_none());
    }

    #[test]
    fn public_failure_serialization_uses_error_code() {
        let value = serde_json::to_value(BackendStatus::Failed {
            generation: 3,
            error_code: BackendErrorCode::ReadinessTimeout,
        })
        .unwrap();
        assert_eq!(value["status"], "failed");
        assert_eq!(value["errorCode"], "readinessTimeout");
        assert!(value.get("nonce").is_none());
    }

    #[test]
    fn backend_status_serializes_with_the_desktop_contract() {
        assert_eq!(
            serde_json::to_value(BackendStatus::Starting { generation: 7 }).unwrap(),
            serde_json::json!({"status": "starting", "generation": 7})
        );
        assert_eq!(
            serde_json::to_value(BackendStatus::Ready {
                generation: 7,
                api_base_url: "http://127.0.0.1:41001/api/".into(),
            })
            .unwrap(),
            serde_json::json!({
                "status": "ready",
                "generation": 7,
                "apiBaseUrl": "http://127.0.0.1:41001/api/"
            })
        );
        assert_eq!(
            serde_json::to_value(BackendStatus::Failed {
                generation: 7,
                error_code: BackendErrorCode::ReadinessTimeout,
            })
            .unwrap(),
            serde_json::json!({
                "status": "failed",
                "generation": 7,
                "errorCode": "readinessTimeout"
            })
        );
    }

    #[test]
    fn stale_generation_cannot_replace_or_remove_current_child() {
        let mut slot = GenerationSlot::default();
        assert!(slot.replace_if_generation(2, 1, "stale").is_err());
        assert_eq!(slot.replace_if_generation(2, 2, "current"), Ok(None));
        assert!(slot.replace_if_generation(2, 1, "stale").is_err());
        assert_eq!(slot.take_if_generation(2, 1), None);
        assert_eq!(slot.take_if_generation(2, 2), Some("current"));
    }

    #[test]
    fn invalidating_current_child_rejects_late_attach_for_old_generation() {
        let mut slot = GenerationSlot::default();
        let mut generation = 1;
        assert_eq!(
            slot.replace_if_generation(generation, generation, "child"),
            Ok(None)
        );
        assert_eq!(slot.invalidate_and_take(&mut generation), Some("child"));
        assert_eq!(generation, 2);
        assert!(slot
            .replace_if_generation(generation, 1, "late-child")
            .is_err());
        assert_eq!(slot.take_if_generation(generation, 1), None);
        assert_eq!(slot.take_current(), None);
    }

    #[tokio::test]
    async fn readiness_probe_sends_the_launch_nonce() {
        use httpmock::prelude::*;

        let server = MockServer::start_async().await;
        let readiness = server
            .mock_async(|when, then| {
                when.method(GET)
                    .path("/api/desktop/health")
                    .header("X-QurioDB-Startup-Nonce", "launch-secret");
                then.status(200).json_body_obj(&serde_json::json!({
                    "status": "ok",
                    "service": "quriodb-desktop"
                }));
            })
            .await;

        let result =
            probe_desktop_health(&reqwest::Client::new(), &server.base_url(), "launch-secret")
                .await;

        readiness.assert_async().await;
        assert_eq!(result, HealthProbeResult::Ready);
    }

    #[tokio::test]
    async fn readiness_probe_reports_identity_mismatch() {
        use httpmock::prelude::*;

        let server = MockServer::start_async().await;
        server
            .mock_async(|when, then| {
                when.method(GET).path("/api/desktop/health");
                then.status(403);
            })
            .await;

        assert_eq!(
            probe_desktop_health(&reqwest::Client::new(), &server.base_url(), "wrong").await,
            HealthProbeResult::IdentityMismatch,
        );
    }

    #[tokio::test]
    async fn readiness_probe_rejects_wrong_identity_body() {
        use httpmock::prelude::*;

        let server = MockServer::start_async().await;
        server
            .mock_async(|when, then| {
                when.method(GET).path("/api/desktop/health");
                then.status(200).json_body_obj(&serde_json::json!({
                    "status": "ok",
                    "service": "other-service"
                }));
            })
            .await;

        assert_eq!(
            probe_desktop_health(&reqwest::Client::new(), &server.base_url(), "launch-secret")
                .await,
            HealthProbeResult::IdentityMismatch,
        );
    }

    #[tokio::test]
    async fn readiness_probe_rejects_malformed_success_body() {
        use httpmock::prelude::*;

        let server = MockServer::start_async().await;
        server
            .mock_async(|when, then| {
                when.method(GET).path("/api/desktop/health");
                then.status(200).body("not-json");
            })
            .await;

        assert_eq!(
            probe_desktop_health(&reqwest::Client::new(), &server.base_url(), "launch-secret")
                .await,
            HealthProbeResult::IdentityMismatch,
        );
    }

    #[tokio::test]
    async fn delayed_probe_is_bounded_to_one_health_interval() {
        use httpmock::prelude::*;
        use std::time::Duration;

        let server = MockServer::start_async().await;
        server
            .mock_async(|when, then| {
                when.method(GET).path("/api/desktop/health");
                then.status(200)
                    .delay(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS + 250));
            })
            .await;

        let result = tokio::time::timeout(
            Duration::from_millis(HEALTH_CHECK_INTERVAL_MS + 250),
            probe_desktop_health(&reqwest::Client::new(), &server.base_url(), "launch-secret"),
        )
        .await
        .expect("a delayed probe should be bounded by one interval");

        assert_eq!(result, HealthProbeResult::Pending);
    }

    #[tokio::test]
    async fn waiter_fails_immediately_when_sidecar_terminates() {
        use std::time::Duration;
        use tokio::sync::oneshot;

        let (terminated_tx, terminated_rx) = oneshot::channel();
        terminated_tx.send(()).unwrap();

        let result = tokio::time::timeout(
            Duration::from_secs(1),
            wait_for_backend_ready(9, "launch-secret", terminated_rx),
        )
        .await
        .expect("termination should beat the one-second test timeout");

        assert_eq!(result, Err(BackendErrorCode::SidecarExited));
    }

    #[tokio::test]
    async fn final_readiness_boundary_prefers_already_queued_termination() {
        use std::io::{Read, Write};
        use std::net::TcpListener;
        use tokio::sync::oneshot;

        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let (terminated_tx, mut terminated_rx) = oneshot::channel();
        std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let _ = stream.read(&mut request);
            stream
                .write_all(
                    b"HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                )
                .unwrap();
            terminated_tx.send(()).unwrap();
        });

        let result =
            wait_for_backend_ready_with_retries(port, "launch-secret", &mut terminated_rx, 1).await;

        assert_eq!(result, Err(BackendErrorCode::SidecarExited));
    }

    #[tokio::test]
    async fn termination_wins_when_readiness_and_termination_are_both_available() {
        use std::io::{Read, Write};
        use std::net::TcpListener;
        use tokio::sync::oneshot;

        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let _ = stream.read(&mut request);
            stream
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 47\r\nConnection: close\r\n\r\n{\"status\":\"ok\",\"service\":\"quriodb-desktop\"}",
                )
                .unwrap();
        });

        let (terminated_tx, mut terminated_rx) = oneshot::channel();
        terminated_tx.send(()).unwrap();
        let result =
            wait_for_backend_ready_with_retries(port, "launch-secret", &mut terminated_rx, 1).await;

        assert_eq!(result, Err(BackendErrorCode::SidecarExited));
    }
}
