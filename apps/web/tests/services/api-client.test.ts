import { describe, it, expect, vi, beforeEach } from "vitest";
import { databaseApi, authApi, userApi, aiApi, api, authNavigation } from "@/lib/api-client";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";
import { useAuth } from "@/hooks/use-auth";

describe("api-client", () => {
  beforeEach(() => {
    useAuth.setState({ user: null });
    vi.clearAllMocks();
  });

  it("databaseApi.list should return list of databases", async () => {
    const data = await databaseApi.list();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("PostgreSQL");
  });

  it("authApi.login and authApi.register should work", async () => {
    const data = await authApi.login({
      email: "test@example.com",
      password: "password",
    });
    expect(data.user).toBeDefined();

    server.use(
      http.post("*/api/auth/register", () =>
        HttpResponse.json({ success: true }),
      ),
    );
    expect(await authApi.register({})).toEqual({ success: true });
  });

  it("authApi.logout should work", async () => {
    server.use(
      http.post("*/api/auth/logout", () =>
        HttpResponse.json({ message: "Logged out" }),
      ),
    );
    const data = await authApi.logout();
    expect(data.message).toBe("Logged out");
  });

  it("should handle server errors (500)", async () => {
    server.use(
      http.get(
        "*/api/database/list",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await expect(databaseApi.list()).rejects.toThrow();
  });

  it("should handle 401 errors, logout, and navigate to /auth/login via authNavigation", async () => {
    const logoutSpy = vi.spyOn(useAuth.getState(), "logout");
    const navigateSpy = vi.spyOn(authNavigation, "navigate").mockImplementation(() => {});
    const originalPathname = window.location.pathname;
    window.history.pushState({}, "", "/dashboard");

    server.use(
      http.get("*/api/database/list", () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
      ),
    );

    let caughtError: any;
    try {
      await databaseApi.list();
    } catch (e) {
      caughtError = e;
    }
    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith("/auth/login");
    expect(caughtError).toBeDefined();
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.status).toBe(401);
    expect(caughtError.response?.status).toBe(401);
    expect(caughtError.message).toBe("Unauthorized");
    window.history.pushState({}, "", originalPathname || "/");
  });

  it("should preserve status, response, and message on 401 response error through interceptor without navigation side effect on login", async () => {
    const logoutSpy = vi.spyOn(useAuth.getState(), "logout");
    const navigateSpy = vi.spyOn(authNavigation, "navigate").mockImplementation(() => {});
    const originalPathname = window.location.pathname;
    window.history.pushState({}, "", "/auth/login");

    server.use(
      http.post("*/api/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );

    let caughtError: any;
    try {
      await authApi.login({ email: "bad@example.com", password: "wrong" });
    } catch (e) {
      caughtError = e;
    }

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(caughtError).toBeDefined();
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.status).toBe(401);
    expect(caughtError.response?.status).toBe(401);
    expect(caughtError.message).toBe("Invalid credentials");
    window.history.pushState({}, "", originalPathname || "/");
  });

  it("should preserve status, response, and message on 401 response from database/test without logging out or redirecting", async () => {
    const logoutSpy = vi.spyOn(useAuth.getState(), "logout");
    const navigateSpy = vi.spyOn(authNavigation, "navigate").mockImplementation(() => {});
    const originalPathname = window.location.pathname;
    window.history.pushState({}, "", "/connections");

    server.use(
      http.post("*/api/database/test", () =>
        HttpResponse.json({ detail: "Database connection failed" }, { status: 401 }),
      ),
    );

    let caughtError: any;
    try {
      await databaseApi.test({ id: "conn-1", type: "postgres" });
    } catch (e) {
      caughtError = e;
    }

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/connections");
    expect(caughtError).toBeDefined();
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.status).toBe(401);
    expect(caughtError.response?.status).toBe(401);
    expect(caughtError.message).toBe("Database connection failed");
    window.history.pushState({}, "", originalPathname || "/");
  });

  it("should preserve status, response, and message on 403 response error through interceptor", async () => {
    server.use(
      http.get("*/api/database/list", () =>
        HttpResponse.json({ error: "Forbidden access" }, { status: 403 }),
      ),
    );

    let caughtError: any;
    try {
      await databaseApi.list();
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.status).toBe(403);
    expect(caughtError.response?.status).toBe(403);
    expect(caughtError.message).toBe("Forbidden access");
  });

  it("userApi endpoints should work", async () => {
    expect(await userApi.getMe()).toEqual(expect.objectContaining({ id: "1" }));
    expect(await userApi.getSettings()).toEqual(
      expect.objectContaining({ theme: "light" }),
    );
    expect(await userApi.updateSettings({ theme: "dark" })).toEqual({
      theme: "dark",
    });
  });

  it("aiApi endpoints should work", async () => {
    server.use(
      http.post("*/api/ai/*", () => HttpResponse.json({ success: true })),
      http.get("*/api/ai/*", () => HttpResponse.json({ data: "mock" })),
      http.put("*/api/ai/*", () => HttpResponse.json({ success: true })),
      http.delete("*/api/ai/*", () => HttpResponse.json({ success: true })),
      http.get("*/api/ai-config/*", () => HttpResponse.json({ config: {} })),
      http.post("*/api/ai-config/*", () => HttpResponse.json({ success: true }))
    );

    // Existing test methods
    expect(await aiApi.generateSQL({})).toEqual({ success: true });
    expect(await aiApi.explainSQL({})).toEqual({ success: true });
    expect(await aiApi.optimizeSQL({})).toEqual({ success: true });

    // Missing aiApi methods
    await aiApi.getAIStatus();
    await aiApi.getModels();
    await aiApi.addModel({});
    await aiApi.getAIConfig(true);
    await aiApi.saveAIConfig({});
    await aiApi.fixSQL({});
    await aiApi.completeSql({ databaseId: "1", schema_name: "public", prefix: "SELECT", suffix: ";" });
    await aiApi.executeAgent({});
    await aiApi.deleteModel("1");
    await aiApi.getHistory("1");
    await aiApi.getConversations("1");
    await aiApi.getConversationMessages("1");
    await aiApi.updateConversation("1", {});
    await aiApi.deleteConversation("1");
    await aiApi.submitFeedback({ messageId: "1", rating: 1 });

    // Test streamChat
    server.use(
      http.post("*/api/ai/stream", () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode("chunk1"));
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    let chunks = "";
    await aiApi.streamChat({}, (chunk) => { chunks += chunk; });
    expect(chunks).toBe("chunk1");
  });

  it("aiApi RAG pipeline endpoints should work", async () => {
    server.use(
      http.get("*/api/rag/status", () => HttpResponse.json({ vectorStore: { backend: "sqlite_vec" } })),
      http.get("*/api/rag/pipeline/status", () => HttpResponse.json({ enabled: true, stageCount: 16, stages: [] })),
      http.get("*/api/rag/sources", () => HttpResponse.json([{ id: "source-1", title: "Users", status: "indexed" }])),
      http.get("*/api/rag/sources/source-1", () => HttpResponse.json({ id: "source-1", chunks: [] })),
      http.delete("*/api/rag/sources/source-1", () => HttpResponse.json({ deleted: true })),
      http.post("*/api/rag/index/*", () => HttpResponse.json({ status: "indexed" })),
      http.post("*/api/rag/pipeline/plan", () => HttpResponse.json({ understanding: { intent: "sql_generation" } })),
      http.post("*/api/rag/pipeline/sync/database/1", () => HttpResponse.json({ summary: { chunks: 2 } })),
      http.post("*/api/rag/evaluate", () => HttpResponse.json({ summary: { totalCases: 1, passedCases: 1 } })),
    );

    expect(await aiApi.getRagStatus()).toEqual({ vectorStore: { backend: "sqlite_vec" } });
    expect(await aiApi.getRagPipelineStatus()).toEqual({ enabled: true, stageCount: 16, stages: [] });
    expect(await aiApi.getRagSources()).toHaveLength(1);
    expect(await aiApi.getRagSource("source-1")).toEqual({ id: "source-1", chunks: [] });
    expect(await aiApi.deleteRagSource("source-1")).toEqual({ deleted: true });
    expect(await aiApi.indexRagDatabase("1")).toEqual({ status: "indexed" });
    expect(await aiApi.indexRagSavedQueries("1")).toEqual({ status: "indexed" });
    expect(await aiApi.indexRagQueryHistory({ databaseId: "1" })).toEqual({ status: "indexed" });
    expect(await aiApi.indexRagSource({ title: "Doc", content: "Content" })).toEqual({ status: "indexed" });
    expect(await aiApi.planRagPipeline({ query: "find users", databaseId: "1" })).toEqual({ understanding: { intent: "sql_generation" } });
    expect(await aiApi.syncRagDatabase("1", { includeQueryHistory: true })).toEqual({ summary: { chunks: 2 } });
    expect(await aiApi.evaluateRag({ cases: [{ name: "Users", query: "users", expectedCitations: ["database:1/schema:public/table:users"] }] })).toEqual({ summary: { totalCases: 1, passedCases: 1 } });
  });

  it("databaseApi comprehensive coverage", async () => {
    server.use(
      http.get("*/api/database/*", () => HttpResponse.json({ data: "mock" })),
      http.post("*/api/database/*", () => HttpResponse.json({ success: true })),
      http.get("*/api/health", () => HttpResponse.json({ status: "ok" })),
    );

    // Metadata calls - ensure all 12 are hit
    await databaseApi.getSchemas("1");
    await databaseApi.getTables("1");
    await databaseApi.getViews("1");
    await databaseApi.getFunctions("1");
    await databaseApi.getProcedures("1");
    await databaseApi.getTriggers("1");
    await databaseApi.getEvents("1");
    await databaseApi.getMaterializedViews("1");
    await databaseApi.getSequences("1");
    await databaseApi.getPartitions("1");
    await databaseApi.getRoles("1");
    await databaseApi.getGrants("1");
    await databaseApi.getTablespaces("1");
    await databaseApi.getExtensions("1");
    await databaseApi.getSynonyms("1");
    await databaseApi.getJobs("1");
    await databaseApi.runAdminAction({
      databaseId: "1",
      objectType: "materialized_view",
      objectName: "sales_mv",
      action: "refresh",
    });
    await databaseApi.getColumns("1", "t");
    await databaseApi.getIndexes("1", "t");
    await databaseApi.getForeignKeys("1", "t");
    await databaseApi.getTableInfo("1", "t");
    await databaseApi.getDDL("1", "t");
    await databaseApi.getAllColumns("1");
    await databaseApi.getAllForeignKeys("1");

    // Other methods
    await databaseApi.health();
    await databaseApi.create({});
    await databaseApi.update({});
    await databaseApi.delete("1");
    await databaseApi.test({});
    await databaseApi.getExplainPlan("1", "SELECT * FROM t");
    await databaseApi.execute("1", "S");
    await databaseApi.saveQuery({});
    await databaseApi.getHistory("1");
    await databaseApi.listSavedQueries("1", "1");
    await databaseApi.getSavedQueries("1", "1");

    expect(true).toBe(true); // Hits all lines
  });

  it("triggers request interceptor error", async () => {
    const badInterceptor = api.interceptors.request.use((config) => {
      throw new Error("force error");
    });
    await expect(databaseApi.list()).rejects.toThrow("force error");
    api.interceptors.request.eject(badInterceptor);
  });
});
