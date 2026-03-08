import { describe, it, expect, vi } from "vitest";
import { databaseApi, authApi, userApi, aiApi } from "@/lib/api-client";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("api-client", () => {
  it("databaseApi.list should return list of databases", async () => {
    const data = await databaseApi.list();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("PostgreSQL");
  });

  it("authApi.login should return user info on success", async () => {
    const data = await authApi.login({
      email: "test@example.com",
      password: "password",
    });
    expect(data.token).toBe("mock-token");
    expect(data.user.email).toBe("test@example.com");
  });

  it("authApi.login should throw error on invalid credentials", async () => {
    // Specifically override handler for this test if needed, but our mock already handles it
    await expect(
      authApi.login({ email: "wrong@example.com", password: "wrong" }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("should handle server errors (500)", async () => {
    server.use(
      http.get("*/api/database/list", () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    await expect(databaseApi.list()).rejects.toThrow();
  });

  it("userApi endpoints should be called correctly using default handlers", async () => {
    // using default handlers from handlers.ts
    const me = await userApi.getMe();
    expect(me.id).toBe("1");
    expect(me.email).toBe("test@example.com");

    const settings = await userApi.getSettings();
    expect(settings.theme).toBe("light");

    const updated = await userApi.updateSettings({ theme: "dark" });
    expect(updated).toEqual({ theme: "dark" });
  });

  it("aiApi endpoints should be called correctly", async () => {
    server.use(
      http.post("*/api/ai/generate-sql", () =>
        HttpResponse.json({ sql: "SELECT *" }),
      ),
      http.post("*/api/ai/explain-sql", () =>
        HttpResponse.json({ explanation: "Selects all" }),
      ),
      http.post("*/api/ai/optimize-sql", () =>
        HttpResponse.json({ sql: "SELECT 1" }),
      ),
    );

    expect(await aiApi.generateSQL({ prompt: "all" })).toEqual({
      sql: "SELECT *",
    });
    expect(await aiApi.explainSQL({ sql: "SELECT *" })).toEqual({
      explanation: "Selects all",
    });
    expect(await aiApi.optimizeSQL({ sql: "SELECT *" })).toEqual({
      sql: "SELECT 1",
    });
  });
});
