/**
 * @file workspace-folder-dialog.ts
 * @description Runtime helpers for choosing workspace folders in browser and Tauri modes.
 */

export async function openTauriFolder(defaultPath?: string) {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({ directory: true, multiple: false, defaultPath });
  return typeof result === "string" ? result : null;
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__?.invoke);
}
