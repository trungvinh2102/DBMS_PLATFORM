import { afterEach, describe, expect, it } from "vitest";
import {
  clearDesktopApiConfiguration,
  configureDesktopApi,
  getApiBaseUrl,
  isTauriRuntime,
} from "@/lib/runtime-api";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const setLocation = (location: Partial<Location>) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      ...location,
    },
  });
};

afterEach(() => {
  clearDesktopApiConfiguration();
  delete window.__TAURI_INTERNALS__;
  setLocation({ hostname: "localhost", protocol: "http:" });
});

describe("runtime API configuration", () => {
  it("rejects Tauri requests before Rust supplies the API URL", () => {
    window.__TAURI_INTERNALS__ = {};
    expect(() => getApiBaseUrl()).toThrow("Desktop backend URL is not configured");
  });

  it("uses and normalizes the dynamic desktop URL after configuration", () => {
    window.__TAURI_INTERNALS__ = {};
    configureDesktopApi("http://127.0.0.1:43123/api");
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:43123/api/");
  });

  it("rejects a non-loopback desktop URL", () => {
    window.__TAURI_INTERNALS__ = {};
    expect(() => configureDesktopApi("https://example.com/api/")).toThrow(
      "Desktop API URL must use 127.0.0.1",
    );
  });

  it.each([
    ["https://127.0.0.1:43123/api/", "HTTP"],
    ["http://localhost:43123/api/", "localhost"],
    ["http://127.0.0.2:43123/api/", "another loopback address"],
    ["http://127.0.0.1/api/", "missing port"],
    ["http://127.0.0.1:43123/", "wrong path"],
    ["http://user:pass@127.0.0.1:43123/api/", "credentials"],
    ["http://127.0.0.1:43123/api/?token=secret", "query"],
    ["http://127.0.0.1:43123/api/#fragment", "hash"],
  ])("rejects desktop URL with %s (%s)", (url) => {
    window.__TAURI_INTERNALS__ = {};
    expect(() => configureDesktopApi(url)).toThrow();
  });

  it("rejects invalid or zero ports", () => {
    window.__TAURI_INTERNALS__ = {};
    expect(() => configureDesktopApi("http://127.0.0.1:0/api/")).toThrow();
    expect(() => configureDesktopApi("http://127.0.0.1:65536/api/")).toThrow();
    expect(() => configureDesktopApi("not a URL")).toThrow();
  });

  it("detects Tauri only from its internal marker", () => {
    setLocation({ hostname: "tauri.localhost", protocol: "https:" });
    expect(isTauriRuntime()).toBe(false);
    window.__TAURI_INTERNALS__ = {};
    expect(isTauriRuntime()).toBe(true);
  });

  it("keeps browser localhost development on the existing API resolution", () => {
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:5000/api/");
  });

  it("uses a relative API path for non-local browser origins", () => {
    setLocation({ hostname: "app.example.com", protocol: "https:" });
    expect(getApiBaseUrl()).toBe("/api/");
  });
});
