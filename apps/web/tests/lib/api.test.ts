import { afterEach, describe, it, expect } from "vitest";
import { api } from "@/lib/api";
import {
  clearDesktopApiConfiguration,
  configureDesktopApi,
} from "@/lib/runtime-api";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

afterEach(() => {
  clearDesktopApiConfiguration();
  delete window.__TAURI_INTERNALS__;
});

describe("api client base", () => {
  it("resolves the configured desktop base URL for each request", async () => {
    window.__TAURI_INTERNALS__ = {};
    configureDesktopApi("http://127.0.0.1:43123/api/");
    const requestHandler = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = await requestHandler({ headers: {} });
    expect(config.baseURL).toBe("http://127.0.0.1:43123/api/");
    expect(config.headers["X-App-Platform"]).toBe("tauri");
  });

  it("should return response correctly through interceptors", async () => {
    // We can simulate an interceptor by directly invoking the registered ones.
    const responseHandler = (api.interceptors.response as any).handlers[0]
      .fulfilled;
    const res = await responseHandler({ data: "ok" });
    expect(res).toBe("ok");
  });

  it("should reject error gracefully through interceptors", async () => {
    const errorHandler = (api.interceptors.response as any).handlers[0]
      .rejected;
    const error = new Error("Test Error");
    await expect(errorHandler(error)).rejects.toThrow("Test Error");
  });
});
