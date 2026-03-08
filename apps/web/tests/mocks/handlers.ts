import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth API
  http.post("*/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as any;

    if (body.email === "test@example.com" && body.password === "password") {
      return HttpResponse.json({
        token: "mock-token",
        user: {
          id: "1",
          email: "test@example.com",
          username: "testuser",
          name: "Test User",
          role: "admin",
        },
      });
    }

    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),

  // Database API
  http.get("*/api/database/list", () => {
    return HttpResponse.json([
      { id: "1", name: "PostgreSQL", type: "postgresql" },
      { id: "2", name: "MySQL", type: "mysql" },
    ]);
  }),

  // User API
  http.get("*/api/user/me", () => {
    return HttpResponse.json({
      id: "1",
      email: "test@example.com",
      username: "testuser",
      name: "Test User",
      role: "admin",
    });
  }),

  http.get("*/api/user/settings", () => {
    return HttpResponse.json({
      theme: "light",
      language: "en",
    });
  }),

  http.post("*/api/user/settings", async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json(body);
  }),

  http.get("*/api/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  http.get("*/api/database/saved-queries", () => {
    return HttpResponse.json([
      { id: "1", name: "Select All Users", sql: "SELECT * FROM users" },
    ]);
  }),

  http.get("*/api/database/history", () => {
    return HttpResponse.json([
      {
        id: "1",
        sql: "SELECT * FROM products",
        executedAt: new Date().toISOString(),
        databaseId: "1",
        executionTime: 120,
      },
      {
        id: "2",
        sql: "UPDATE users SET active = true",
        executedAt: new Date().toISOString(),
        databaseId: "2",
        executionTime: 45,
      },
    ]);
  }),
];
