import { afterEach, describe, it, expect } from "vitest";
import { resolveUrl } from "@/lib/api-client";
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

describe("resolveUrl", () => {
  it("returns empty string for null", () => {
    expect(resolveUrl(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(resolveUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(resolveUrl("")).toBe("");
  });

  it("returns http URLs unchanged", () => {
    expect(resolveUrl("http://example.com/img.png")).toBe(
      "http://example.com/img.png",
    );
  });

  it("returns https URLs unchanged", () => {
    expect(resolveUrl("https://example.com/img.png")).toBe(
      "https://example.com/img.png",
    );
  });

  it("returns data URIs unchanged", () => {
    const dataUri = "data:image/png;base64,abc123";
    expect(resolveUrl(dataUri)).toBe(dataUri);
  });

  it("resolves relative path without leading slash", () => {
    const result = resolveUrl("uploads/avatar.png");
    expect(result).toContain("uploads/avatar.png");
    // Should not contain /api/ in the resolved URL
    expect(result).not.toContain("/api/uploads");
  });

  it("resolves relative path with leading slash", () => {
    const result = resolveUrl("/uploads/avatar.png");
    expect(result).toContain("/uploads/avatar.png");
    expect(result).not.toContain("//uploads");
  });

  it("resolves resources against the configured desktop backend", () => {
    window.__TAURI_INTERNALS__ = {};
    configureDesktopApi("http://127.0.0.1:43123/api/");
    expect(resolveUrl("/uploads/avatar.png")).toBe(
      "http://127.0.0.1:43123/uploads/avatar.png",
    );
  });
});
