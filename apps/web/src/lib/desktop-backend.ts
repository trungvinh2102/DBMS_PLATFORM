import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type BackendErrorCode =
  | "spawnFailed"
  | "sidecarExited"
  | "readinessTimeout"
  | "identityMismatch"
  | "restartFailed";

export type BackendStatus =
  | { status: "starting"; generation: number }
  | { status: "ready"; generation: number; apiBaseUrl: string }
  | { status: "failed"; generation: number; errorCode: BackendErrorCode };

export function getBackendStatus(): Promise<BackendStatus> {
  return invoke<BackendStatus>("get_backend_status");
}

export function restartBackend(): Promise<BackendStatus> {
  return invoke<BackendStatus>("restart_backend");
}

export function subscribeBackendStatus(
  onStatus: (status: BackendStatus) => void,
): Promise<UnlistenFn> {
  return listen<BackendStatus>("backend-status-changed", ({ payload }) => onStatus(payload));
}

export function quitDesktop(): Promise<void> {
  return getCurrentWindow().close();
}
