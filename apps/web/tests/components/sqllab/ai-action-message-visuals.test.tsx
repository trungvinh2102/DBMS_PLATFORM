/**
 * @file ai-action-message-visuals.test.tsx
 * @description Focused coverage for action message metadata and fenced SQL content.
 */

import { act, render, renderHook, waitFor } from "../../test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aiApi } from "@/lib/api-client";
import { useAIChat } from "@/app/sqllab/hooks/useAIChat";
import { AIMessage } from "@/app/sqllab/components/ai/AIMessage";
import { MarkdownRenderer } from "@/app/sqllab/components/ai/MarkdownRenderer";

describe("AI action message visuals", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(aiApi, "getConversations").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["explain", "Explain SQL"],
    ["optimize", "Optimize SQL"],
  ] as const)("marks %s messages and preserves exact SQL in a fenced block", async (action, label) => {
    const sql = `SELECT name, 'active' AS status
-- keep this comment
FROM users
WHERE role = 'admin';`;
    vi.spyOn(aiApi, "streamAction").mockResolvedValue();

    const { result } = renderHook(() => useAIChat("db-1"));

    await act(async () => {
      await result.current.handleActionStream(action, sql);
    });

    await waitFor(() => expect(result.current.messages.some((message) => message.role === "user")).toBe(true));
    expect(result.current.messages.find((message) => message.role === "user")).toEqual({
      id: expect.any(String),
      role: "user",
      action,
      content: `${label}:\n\n\`\`\`sql\n${sql}\n\`\`\``,
    });
  });

  it("does not mark a normal user message as an action", async () => {
    vi.spyOn(aiApi, "streamChat").mockResolvedValue();

    const { result } = renderHook(() => useAIChat("db-1"));

    await act(async () => {
      await result.current.handleSend("Show active users");
    });

    await waitFor(() => expect(result.current.messages.some((message) => message.role === "user")).toBe(true));
    expect(result.current.messages.find((message) => message.role === "user")).toEqual({
      id: expect.any(String),
      role: "user",
      content: "Show active users",
    });
    expect(result.current.messages.find((message) => message.role === "user")).not.toHaveProperty("action");
  });

  it.each([
    ["explain", "Explain this SQL: ", "Explain SQL"],
    ["optimize", "Optimize this SQL: ", "Optimize SQL"],
    ["explain", "Explain SQL:\n\n", "Explain SQL"],
    ["optimize", "Optimize SQL:\n\n", "Optimize SQL"],
  ] as const)("reconstructs persisted %s action messages after reload", async (action, prefix, label) => {
    const sql = "SELECT `name`,\n  status\nFROM users;";
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({
      id: "conv-reloaded",
      messages: [{ id: "user-action", role: "user", content: `${prefix}${sql}` }],
    });

    const { result } = renderHook(() => useAIChat("db-1"));

    await act(async () => {
      await result.current.loadConversation("conv-reloaded");
    });

    expect(result.current.messages).toEqual([{
      id: "user-action",
      role: "user",
      action,
      content: `${label}:\n\n\`\`\`sql\n${sql}\n\`\`\``,
      isActionable: false,
    }]);
  });

  it("preserves unrelated persisted user content exactly after reload", async () => {
    const content = "Explain SQL: but this is just a note\n\nwith formatting";
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({
      id: "conv-reloaded",
      messages: [{ id: "user-normal", role: "user", content }],
    });

    const { result } = renderHook(() => useAIChat("db-1"));

    await act(async () => {
      await result.current.loadConversation("conv-reloaded");
    });

    expect(result.current.messages).toEqual([{
      id: "user-normal",
      role: "user",
      content,
      isActionable: false,
    }]);
  });

  it.each([
    ["explain", "max-w-[90%]"],
    ["optimize", "max-w-[90%]"],
    [undefined, "max-w-[78%]"],
  ] as const)("uses the approved width for %s user messages", (action, widthClass) => {
    const { container } = render(
      <AIMessage
        message={{
          id: `user-${action || "normal"}`,
          role: "user",
          action,
          content: action ? `${action} SQL` : "Show active users",
        }}
        onExplain={vi.fn()}
        onOptimize={vi.fn()}
      />,
    );

    const messageGroup = container.querySelector(".group");
    expect(messageGroup).toHaveClass(widthClass, "items-end");
    expect(container.firstElementChild).toHaveClass("flex-row-reverse");
  });

  it("renders SQL token classes without changing the code text", () => {
    const sql = "SELECT name, 'active' AS status -- comment\nFROM users WHERE id >= 42;";

    const { container } = render(
      <MarkdownRenderer content={["```sql", sql, "```"].join("\n")} isDark={false} role="assistant" />,
    );

    const code = container.querySelector("pre code");
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toBe(sql);
    expect(container.querySelector(".sql-token-keyword")).toHaveTextContent("SELECT");
    expect(container.querySelector(".sql-token-string")).toHaveTextContent("'active'");
    expect(container.querySelector(".sql-token-comment")).toHaveTextContent("-- comment");
    expect(container.querySelector(".sql-token-number")).toHaveTextContent("42");
    expect(container.querySelector(".sql-token-operator")).toHaveTextContent(">=");
  });

  it("uses readable light-mode classes for user SQL while preserving dark-mode classes and tokens", () => {
    const sql = "SELECT 'active' -- comment\nFROM users WHERE id >= 42;";
    const content = ["```sql", sql, "```"].join("\n");

    const { container: lightContainer } = render(
      <MarkdownRenderer content={content} isDark={false} role="user" />,
    );
    const lightPre = lightContainer.querySelector("pre");

    expect(lightPre).toHaveClass("bg-indigo-50", "border-indigo-200", "text-slate-900");
    expect(lightPre).not.toHaveClass("bg-black/20", "border-white/15", "text-primary-foreground");
    expect(lightContainer.querySelector("pre code")?.textContent).toBe(sql);
    expect(lightContainer.querySelector(".sql-token-keyword")).toHaveClass("text-indigo-800");
    expect(lightContainer.querySelector(".sql-token-string")).toHaveClass("text-emerald-800");
    expect(lightContainer.querySelector(".sql-token-comment")).toHaveClass("text-slate-600");
    expect(lightContainer.querySelector(".sql-token-number")).toHaveClass("text-amber-800");
    expect(lightContainer.querySelector(".sql-token-operator")).toHaveClass("text-violet-800");

    const { container: darkContainer } = render(
      <MarkdownRenderer content={content} isDark={true} role="user" />,
    );
    const darkPre = darkContainer.querySelector("pre");

    expect(darkPre).toHaveClass("bg-black/20", "border-white/15", "text-primary-foreground");
    expect(darkContainer.querySelector("pre code")?.textContent).toBe(sql);
    expect(darkContainer.querySelector(".sql-token-keyword")).toHaveClass("text-sky-600", "dark:text-sky-400");
    expect(darkContainer.querySelector(".sql-token-string")).toHaveClass("text-emerald-600", "dark:text-emerald-400");
    expect(darkContainer.querySelector(".sql-token-comment")).toHaveClass("text-muted-foreground");
    expect(darkContainer.querySelector(".sql-token-number")).toHaveClass("text-amber-600", "dark:text-amber-400");
    expect(darkContainer.querySelector(".sql-token-operator")).toHaveClass("text-violet-600", "dark:text-violet-400");
  });

  it.each(["js", "json", "python", "unknown"])("leaves a %s fence un-tokenized", (language) => {
    const source = "SELECT value >= 42;";

    const { container } = render(
      <MarkdownRenderer content={[`\`\`\`${language}`, source, "```"].join("\n")} isDark={false} role="assistant" />,
    );

    expect(container.querySelector("pre code")?.textContent).toBe(source);
    expect(container.querySelector("pre code")).toHaveClass(`language-${language}`);
    expect(container.querySelector(".sql-token-keyword")).not.toBeInTheDocument();
    expect(container.querySelector(".sql-token-operator")).not.toBeInTheDocument();
  });

  it.each([
    "SELECT /* FROM hidden WHERE id = 1 */ name FROM users;",
    "SELECT /* incomplete FROM hidden WHERE id = 1",
  ])("tokenizes closed and incomplete block comments without styling their contents", (sql) => {
    const { container } = render(
      <MarkdownRenderer content={["```sql", sql, "```"].join("\n")} isDark={false} role="assistant" />,
    );

    expect(container.querySelector("pre code")?.textContent).toBe(sql);
    const comment = container.querySelector(".sql-token-comment");
    const commentEnd = sql.indexOf("*/");
    expect(comment).toHaveTextContent(sql.slice(sql.indexOf("/*"), commentEnd === -1 ? undefined : commentEnd + 2));
    expect(comment?.querySelector(".sql-token-keyword")).not.toBeInTheDocument();
    expect(comment?.querySelector(".sql-token-operator")).not.toBeInTheDocument();
  });

  it("chooses a longer action fence when SQL contains triple backticks", async () => {
    const sql = "SELECT 1;\n```\nSELECT 2;";
    vi.spyOn(aiApi, "streamAction").mockResolvedValue();

    const { result } = renderHook(() => useAIChat("db-1"));

    await act(async () => {
      await result.current.handleActionStream("explain", sql);
    });

    const userMessage = result.current.messages.find((message) => message.role === "user");
    expect(userMessage?.content).toBe(`Explain SQL:\n\n\`\`\`\`sql\n${sql}\n\`\`\`\``);

    const { container } = render(
      <MarkdownRenderer content={userMessage?.content || ""} isDark={false} role="user" />,
    );
    expect(container.querySelectorAll("pre")).toHaveLength(1);
    expect(container.querySelector("pre code")?.textContent).toBe(sql);
  });

  it("reloads an action message with its longer SQL fence intact", async () => {
    const sql = "SELECT 1;\n```\nSELECT 2;";
    vi.spyOn(aiApi, "getConversationMessages").mockResolvedValue({
      id: "conv-reloaded-fenced-action",
      messages: [{
        id: "user-fenced-action",
        role: "user",
        content: `Explain SQL:\n\n\`\`\`\`sql\n${sql}\n\`\`\`\``,
      }],
    });

    const { result } = renderHook(() => useAIChat("db-1"));
    await act(async () => {
      await result.current.loadConversation("conv-reloaded-fenced-action");
    });

    expect(result.current.messages[0]).toEqual(expect.objectContaining({
      action: "explain",
      content: `Explain SQL:\n\n\`\`\`\`sql\n${sql}\n\`\`\`\``,
    }));
  });

  it("renders an incomplete SQL fence safely with its exact text", () => {
    const sql = "SELECT * FROM users WHERE name = 'active'";

    const { container } = render(
      <MarkdownRenderer content={["```sql", sql].join("\n")} isDark={true} role="assistant" />,
    );

    const code = container.querySelector("pre code");
    expect(code).toBeInTheDocument();
    expect(code?.textContent).toBe(sql);
    expect(container.querySelector("pre")).toHaveClass("overflow-auto", "font-mono");
  });
});
