import { describe, it, expect, vi } from "vitest";
import { proxy } from "@/proxy";
import { NextRequest, NextResponse } from "next/server";

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn().mockReturnValue({ type: "next" }),
    redirect: vi.fn((url: URL) => ({ type: "redirect", url })),
  },
}));

describe("Proxy Middleware", () => {
  it("redirects to login for protected routes when not authenticated", () => {
    const request = {
      nextUrl: { pathname: "/sqllab" },
      cookies: { get: vi.fn().mockReturnValue(null) },
      url: "http://localhost:3000/sqllab",
    } as any as NextRequest;

    const result = proxy(request) as any;
    expect(result.type).toBe("redirect");
    expect(result.url.toString()).toContain("/auth/login");
  });

  it("redirects to dashboard for auth routes when authenticated", () => {
    const request = {
      nextUrl: { pathname: "/auth/login" },
      cookies: { get: vi.fn().mockReturnValue({ value: "token" }) },
      url: "http://localhost:3000/auth/login",
    } as any as NextRequest;

    const result = proxy(request) as any;
    expect(result.type).toBe("redirect");
    expect(result.url.toString()).toBe("http://localhost:3000/");
  });

  it("allows access for public routes", () => {
    const request = {
      nextUrl: { pathname: "/docs" },
      cookies: { get: vi.fn().mockReturnValue(null) },
      url: "http://localhost:3000/docs",
    } as any as NextRequest;

    const result = proxy(request) as any;
    expect(result.type).toBe("next");
  });

  it("allows access to protected routes when authenticated", () => {
    const request = {
      nextUrl: { pathname: "/sqllab" },
      cookies: { get: vi.fn().mockReturnValue({ value: "token" }) },
      url: "http://localhost:3000/sqllab",
    } as any as NextRequest;

    const result = proxy(request) as any;
    expect(result.type).toBe("next");
  });

  it("allows access to auth routes when not authenticated", () => {
    const request = {
      nextUrl: { pathname: "/auth/login" },
      cookies: { get: vi.fn().mockReturnValue(null) },
      url: "http://localhost:3000/auth/login",
    } as any as NextRequest;

    const result = proxy(request) as any;
    expect(result.type).toBe("next");
  });
});
