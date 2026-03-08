import { describe, it, expect, vi } from "vitest";
import { api } from "@/lib/api";

describe("api client base", () => {
  it("should have correct baseURL", () => {
    // defaults to localhost:5000/api in tests
    expect(api.defaults.baseURL).toContain("/api");
  });

  it("should return response correctly through interceptors", async () => {
    // We can simulate an interceptor by directly invoking the registered ones.
    const responseHandler = (api.interceptors.response as any).handlers[0]
      .fulfilled;
    const res = await responseHandler({ data: "ok" });
    expect(res).toEqual({ data: "ok" });
  });

  it("should reject error gracefully through interceptors", async () => {
    const errorHandler = (api.interceptors.response as any).handlers[0]
      .rejected;
    const error = new Error("Test Error");
    await expect(errorHandler(error)).rejects.toThrow("Test Error");
  });
});
