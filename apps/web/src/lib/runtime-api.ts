/** Runtime API URL configuration shared by Axios, fetch, and resource URLs. */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

let desktopApiBaseUrl: string | undefined;

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export function configureDesktopApi(apiBaseUrl: string): void {
  const parsed = new URL(apiBaseUrl);
  const authority = apiBaseUrl.slice(apiBaseUrl.indexOf("//") + 2).split(/[/?#]/, 1)[0];
  const portMatch = authority.match(/^127\.0\.0\.1:(\d+)$/);
  const port = portMatch ? Number(portMatch[1]) : 0;

  if (parsed.protocol !== "http:" || parsed.hostname !== "127.0.0.1") {
    throw new Error("Desktop API URL must use 127.0.0.1 over HTTP");
  }
  if (!port || port > 65535 || parsed.username || parsed.password) {
    throw new Error("Desktop API URL must include a dynamic port and /api/");
  }
  if (parsed.search || parsed.hash || !["/api", "/api/"].includes(parsed.pathname)) {
    throw new Error("Desktop API URL must include a dynamic port and /api/");
  }

  desktopApiBaseUrl = `http://127.0.0.1:${port}/api/`;
}

export function clearDesktopApiConfiguration(): void {
  desktopApiBaseUrl = undefined;
}

export function getApiBaseUrl(): string {
  if (isTauriRuntime()) {
    if (!desktopApiBaseUrl) {
      throw new Error("Desktop backend URL is not configured");
    }
    return desktopApiBaseUrl;
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== "undefined") {
    return withTrailingSlash(envUrl);
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:5000/api/";
    }
    return "/api/";
  }
  return "http://127.0.0.1:5000/api/";
}
