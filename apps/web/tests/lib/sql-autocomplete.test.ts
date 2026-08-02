import { describe, expect, it, vi } from "vitest";

import { aiApi } from "@/lib/api-client";
import {
  getSqlColumnCompletionParts,
  buildSqlTriggerCharacters,
  registerSqlAutocomplete,
  registerSqlSuggestOnTyping,
} from "@/lib/monaco/sql-autocomplete";
import {
  sanitizeInlineSqlCompletion,
  shouldRequestInlineSqlCompletion,
  trimInlineCompletionContext,
} from "@/lib/monaco/sql-inline-ai-completion";
import {
  getSqlDialectCompletions,
  normalizeSqlDialect,
} from "@/lib/monaco/sql-dialect-completions";

const createInlineMonaco = (inlineProviders: any[]) => ({
  Range: class Range {},
  languages: {
    CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
    InlineCompletionTriggerKind: { Explicit: 1 },
    registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerInlineCompletionsProvider: vi.fn((language, provider) => {
      inlineProviders.push({ language, provider });
      return { dispose: vi.fn() };
    }),
  },
});

const createInlineModel = (
  getVersionId: () => number,
  prefix = "SELECT",
) => ({
  getVersionId,
  getValueInRange: ({ startColumn }: { startColumn: number }) =>
    startColumn === 8 ? "" : prefix,
  getLineCount: () => 1,
  getLineMaxColumn: () => 8,
});

const createInlineToken = () => {
  let callback: (() => void) | undefined;
  const token: any = {
    isCancellationRequested: false,
    onCancellationRequested: vi.fn((listener: () => void) => {
      callback = listener;
      return { dispose: vi.fn() };
    }),
    cancel: () => {
      token.isCancellationRequested = true;
      callback?.();
    },
  };
  return token;
};

describe("SQL dialect completions", () => {
  it("normalizes common dialect aliases", () => {
    expect(normalizeSqlDialect("postgres")).toBe("postgresql");
    expect(normalizeSqlDialect("mssql")).toBe("sqlserver");
    expect(normalizeSqlDialect("SQL Server")).toBe("sqlserver");
  });

  it("returns dialect-specific keywords and snippets", () => {
    const duckdb = getSqlDialectCompletions("duckdb");
    const oracle = getSqlDialectCompletions("oracle");

    expect(duckdb.keywords).toContain("read_parquet");
    expect(duckdb.snippets.map((snippet) => snippet.label)).toContain(
      "read_csv_auto",
    );
    expect(oracle.keywords).toContain("CONNECT BY");
    expect(oracle.snippets.map((snippet) => snippet.label)).toContain(
      "PL/SQL BLOCK",
    );
  });
});

describe("inline SQL completion helpers", () => {
  it("requests AI completion after SQL clause triggers", () => {
    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "SELECT",
        currentLinePrefix: "SELECT",
        nextCharacter: "",
        isExplicit: false,
      }),
    ).toBe(true);
  });

  it("skips AI completion in comments, strings, and middle of identifiers", () => {
    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "-- SELECT",
        currentLinePrefix: "-- SELECT",
        nextCharacter: "",
        isExplicit: false,
      }),
    ).toBe(false);

    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "SELECT 'abc",
        currentLinePrefix: "SELECT 'abc",
        nextCharacter: "",
        isExplicit: true,
      }),
    ).toBe(false);

    expect(
      shouldRequestInlineSqlCompletion({
        prefix: "SELECT use",
        currentLinePrefix: "SELECT use",
        nextCharacter: "r",
        isExplicit: true,
      }),
    ).toBe(false);
  });

  it("limits context sent to the AI endpoint", () => {
    const context = trimInlineCompletionContext(
      "x".repeat(5_000),
      "y".repeat(2_000),
    );

    expect(context.prefix).toHaveLength(4_000);
    expect(context.suffix).toHaveLength(1_200);
  });

  it("cleans markdown fences and repeated current-line prefixes", () => {
    expect(
      sanitizeInlineSqlCompletion("SELECT", "```sql\nSELECT * FROM users\n```"),
    ).toBe("* FROM users");
  });
});

describe("SQL column completion metadata", () => {
  it("does not render undefined table prefixes when column metadata has no table", () => {
    expect(
      getSqlColumnCompletionParts({ name: "customer_id", type: "INTEGER" }),
    ).toEqual({
      tableName: "",
      columnName: "customer_id",
      columnType: "INTEGER",
      label: "customer_id",
      filterText: "customer_id",
    });
  });

  it("supports alternate backend column metadata field names", () => {
    expect(
      getSqlColumnCompletionParts({
        table_name: "orders",
        column_name: "created_at",
        data_type: "TIMESTAMP",
      }),
    ).toMatchObject({
      tableName: "orders",
      columnName: "created_at",
      columnType: "TIMESTAMP",
      label: "orders.created_at",
    });
  });
});

describe("SQL completion provider triggers", () => {
  it("opens SQL suggestions immediately when typing an identifier character", () => {
    let listener: ((event: any) => void) | undefined;
    const editor = {
      onDidChangeModelContent: vi.fn((callback) => {
        listener = callback;
        return { dispose: vi.fn() };
      }),
      trigger: vi.fn(),
    };

    registerSqlSuggestOnTyping(editor as any);
    listener?.({ changes: [{ text: "s" }] });

    expect(editor.trigger).toHaveBeenCalledWith(
      "quriodb.sql-autocomplete",
      "editor.action.triggerSuggest",
      {},
    );
  });

  it("does not open SQL suggestions for whitespace or paste changes", () => {
    let listener: ((event: any) => void) | undefined;
    const editor = {
      onDidChangeModelContent: vi.fn((callback) => {
        listener = callback;
        return { dispose: vi.fn() };
      }),
      trigger: vi.fn(),
    };

    registerSqlSuggestOnTyping(editor as any);
    listener?.({ changes: [{ text: " " }] });
    listener?.({ changes: [{ text: "SELECT" }] });

    expect(editor.trigger).not.toHaveBeenCalled();
  });

  it("does not retrigger SQL suggestions while continuing the same word", () => {
    let listener: ((event: any) => void) | undefined;
    let lineContent = "s";
    const editor = {
      getModel: vi.fn(() => ({
        getLineContent: vi.fn(() => lineContent),
      })),
      onDidChangeModelContent: vi.fn((callback) => {
        listener = callback;
        return { dispose: vi.fn() };
      }),
      trigger: vi.fn(),
    };

    registerSqlSuggestOnTyping(editor as any);
    listener?.({
      changes: [{ text: "s", range: { startLineNumber: 1, startColumn: 1 } }],
    });
    lineContent = "se";
    listener?.({
      changes: [{ text: "e", range: { startLineNumber: 1, startColumn: 2 } }],
    });

    expect(editor.trigger).toHaveBeenCalledTimes(1);
  });

  it("registers inline completions with Monaco's disposal callback", () => {
    const inlineProviders: any[] = [];
    const monaco = {
      Range: class Range {
        constructor(
          public startLineNumber: number,
          public startColumn: number,
          public endLineNumber: number,
          public endColumn: number,
        ) {}
      },
      languages: {
        CompletionItemKind: {
          Class: 1,
          Field: 2,
          Keyword: 3,
          Snippet: 4,
        },
        InlineCompletionTriggerKind: {
          Explicit: 1,
        },
        registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerInlineCompletionsProvider: vi.fn((language, provider) => {
          inlineProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };

    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
    );

    expect(inlineProviders[0]?.language).toBe("sql");
    expect(inlineProviders[0]?.provider.disposeInlineCompletions).toEqual(
      expect.any(Function),
    );

    disposable.dispose();
  });

  it("reuses normalized columns until the metadata array changes", () => {
    const completionProviders: any[] = [];
    let nameReads = 0;
    const column = {
      table: "users",
      get name() {
        nameReads += 1;
        return "id";
      },
      type: "INTEGER",
    };
    const columnsRef = { current: [column] };
    const monaco = {
      Range: class Range {},
      languages: {
        CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };

    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      columnsRef as any,
    );
    const provider = completionProviders[0].provider;
    const model = {
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
      getVersionId: () => 1,
      getValueInRange: () => "",
      getValue: () => "",
    };

    provider.provideCompletionItems(model, { lineNumber: 1, column: 1 });
    provider.provideCompletionItems(model, { lineNumber: 1, column: 1 });
    expect(nameReads).toBe(1);

    columnsRef.current = [
      { table: "users", name: "email", type: "TEXT" },
    ];
    const suggestions = provider.provideCompletionItems(model, {
      lineNumber: 1,
      column: 1,
    }).suggestions;
    expect(suggestions.map((item: any) => item.label)).toContain("users.email");

    disposable.dispose();
  });

  it("invalidates normalized columns when metadata array is replaced", () => {
    const completionProviders: any[] = [];
    const column = { table: "users", name: "id", type: "INTEGER" };
    const columnsRef = { current: [column] };
    const monaco = {
      Range: class Range {},
      languages: {
        CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      columnsRef as any,
    );
    const provider = completionProviders[0].provider;
    const model = {
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
      getVersionId: () => 1,
      getValueInRange: () => "",
      getValue: () => "",
    };

    expect(
      provider
        .provideCompletionItems(model, { lineNumber: 1, column: 1 })
        .suggestions.map((item: any) => item.label),
    ).toContain("users.id");

    columnsRef.current = [{ table: "users", name: "email", type: "TEXT" }];
    expect(
      provider
        .provideCompletionItems(model, { lineNumber: 1, column: 1 })
        .suggestions.map((item: any) => item.label),
    ).toContain("users.email");

    disposable.dispose();
  });

  it("invalidates normalized columns when the metadata revision changes in place", () => {
    const completionProviders: any[] = [];
    const column = { table: "users", name: "id", type: "INTEGER" };
    const columnsRef = { current: [column] };
    const metadataRevisionRef = { current: 0 };
    const monaco = {
      Range: class Range {},
      languages: {
        CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      columnsRef as any,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      metadataRevisionRef,
    );
    const provider = completionProviders[0].provider;
    const model = {
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
      getVersionId: () => 1,
      getValueInRange: () => "",
      getValue: () => "",
    };

    expect(
      provider
        .provideCompletionItems(model, { lineNumber: 1, column: 1 })
        .suggestions.map((item: any) => item.label),
    ).toContain("users.id");

    column.name = "email";
    metadataRevisionRef.current = 1;
    expect(
      provider
        .provideCompletionItems(model, { lineNumber: 1, column: 1 })
        .suggestions.map((item: any) => item.label),
    ).toContain("users.email");

    disposable.dispose();
  });

  it("does not register AI inline completions by default", () => {
    const monaco = {
      Range: class Range {
        constructor(
          public startLineNumber: number,
          public startColumn: number,
          public endLineNumber: number,
          public endColumn: number,
        ) {}
      },
      languages: {
        CompletionItemKind: {
          Class: 1,
          Field: 2,
          Keyword: 3,
          Snippet: 4,
        },
        InlineCompletionTriggerKind: {
          Explicit: 1,
        },
        registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerInlineCompletionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
      },
    };

    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
    );

    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
    expect(
      monaco.languages.registerInlineCompletionsProvider,
    ).not.toHaveBeenCalled();

    disposable.dispose();
  });

  it("uses punctuation triggers while preserving keyword suggestions", () => {
    const completionProviders: any[] = [];
    const monaco = {
      Range: class Range {
        constructor(
          public startLineNumber: number,
          public startColumn: number,
          public endLineNumber: number,
          public endColumn: number,
        ) {}
      },
      languages: {
        CompletionItemKind: {
          Class: 1,
          Field: 2,
          Keyword: 3,
          Snippet: 4,
        },
        InlineCompletionTriggerKind: {
          Explicit: 1,
        },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
        registerInlineCompletionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
      },
    };

    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
    );

    const sqlProvider = completionProviders.find(
      (entry) => entry.language === "sql",
    )?.provider;
    expect(sqlProvider?.triggerCharacters).toEqual([".", '"', "`"]);
    expect(sqlProvider?.triggerCharacters).not.toContain("s");

    const suggestions = sqlProvider.provideCompletionItems(
      {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
        getVersionId: () => 1,
        getValueInRange: () => "s",
        getValue: () => "s",
      },
      { lineNumber: 1, column: 2 },
    ).suggestions;

    expect(suggestions.map((item: any) => item.label)).toContain("SELECT");

    disposable.dispose();
  });

  it("resolves aliases for table.column suggestions and invalidates metadata changes", () => {
    const completionProviders: any[] = [];
    const columnsRef = {
      current: [{ table: "users", name: "id", type: "INTEGER" }],
    };
    const monaco = {
      Range: class Range {},
      languages: {
        CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      columnsRef as any,
    );
    const provider = completionProviders[0].provider;
    const model = (textUntilPosition: string, value: string) => ({
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
      getVersionId: () => value.length,
      getValueInRange: () => textUntilPosition,
      getValue: () => value,
    });

    expect(
      provider.provideCompletionItems(
        model("SELECT u.", "SELECT * FROM users u"),
        { lineNumber: 1, column: 10 },
      ).suggestions.map((item: any) => item.label),
    ).toContain("id");

    columnsRef.current = [
      { table: "orders", name: "order_id", type: "INTEGER" },
    ];
    expect(
      provider.provideCompletionItems(
        model("SELECT o.", "SELECT * FROM orders o"),
        { lineNumber: 1, column: 10 },
      ).suggestions.map((item: any) => item.label),
    ).toContain("order_id");

    disposable.dispose();
  });

  it("scopes alias completion to each provider model identity", () => {
    const completionProviders: any[] = [];
    const monaco = {
      Range: class Range {},
      languages: {
        CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };
    const register = (table: string) =>
      registerSqlAutocomplete(
        monaco as any,
        { current: [] },
        { current: [{ table, name: "id", type: "INTEGER" }] },
      );
    const firstDisposable = register("users");
    const secondDisposable = register("orders");
    const firstProvider = completionProviders[0].provider;
    const secondProvider = completionProviders[1].provider;
    const model = (text: string, value: string) => ({
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
      getVersionId: () => 1,
      getValueInRange: () => text,
      getValue: () => value,
    });

    expect(
      firstProvider
        .provideCompletionItems(
          model("SELECT u.", "SELECT * FROM users u"),
          { lineNumber: 1, column: 10 },
        )
        .suggestions.map((item: any) => item.label),
    ).toContain("id");
    expect(
      secondProvider
        .provideCompletionItems(
          model("SELECT o.", "SELECT * FROM orders o"),
          { lineNumber: 1, column: 10 },
        )
        .suggestions.map((item: any) => item.label),
    ).toContain("id");

    firstDisposable.dispose();
    secondDisposable.dispose();
  });

  it("clears pending inline completion work when disposed", async () => {
    vi.useFakeTimers();
    const inlineProviders: any[] = [];
    let requestSignal: AbortSignal | undefined;
    const completeSql = vi
      .spyOn(aiApi, "completeSql")
      .mockImplementation((_data, signal) => {
        requestSignal = signal;
        return new Promise(() => {});
      });
    const monaco = {
      Range: class Range {},
      languages: {
        CompletionItemKind: { Class: 1, Field: 2, Keyword: 3, Snippet: 4 },
        InlineCompletionTriggerKind: { Explicit: 1 },
        registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
        registerInlineCompletionsProvider: vi.fn((language, provider) => {
          inlineProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
      },
    };
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
    );
    const model = {
      getVersionId: () => 1,
      getValueInRange: ({ startColumn }: { startColumn: number }) =>
        startColumn === 8 ? "" : "SELECT",
      getLineCount: () => 1,
      getLineMaxColumn: () => 8,
    };
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(),
    };

    inlineProviders[0].provider.provideInlineCompletions(
      model,
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      token,
    );
    await vi.advanceTimersByTimeAsync(600);

    expect(completeSql).toHaveBeenCalledTimes(1);
    disposable.dispose();
    expect(requestSignal?.aborted).toBe(true);
    completeSql.mockRestore();
    vi.useRealTimers();
  });

  it("does not cache or return an inline completion after the model changes", async () => {
    vi.useFakeTimers();
    const inlineProviders: any[] = [];
    let resolveCompletion!: (value: { completion: string }) => void;
    let modelVersion = 1;
    const completeSql = vi.spyOn(aiApi, "completeSql").mockImplementation(
      () => new Promise((resolve) => {
        resolveCompletion = resolve;
      }),
    );
    const monaco = createInlineMonaco(inlineProviders);
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
    );
    const model = createInlineModel(() => modelVersion);
    const token = createInlineToken();
    const request = inlineProviders[0].provider.provideInlineCompletions(
      model,
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      token,
    );

    await vi.advanceTimersByTimeAsync(600);
    modelVersion = 2;
    resolveCompletion({ completion: " * FROM users" });

    expect(await request).toEqual({ items: [] });
    disposable.dispose();
    completeSql.mockRestore();
    vi.useRealTimers();
  });

  it("settles superseded requests and does not call AI after cancellation", async () => {
    vi.useFakeTimers();
    const inlineProviders: any[] = [];
    const completeSql = vi.spyOn(aiApi, "completeSql").mockResolvedValue({
      completion: " * FROM users",
    } as any);
    const monaco = createInlineMonaco(inlineProviders);
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
    );
    const model = createInlineModel(() => 1);
    const firstToken = createInlineToken();
    const first = inlineProviders[0].provider.provideInlineCompletions(
      model,
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      firstToken,
    );
    firstToken.cancel();

    expect(await first).toEqual({ items: [] });
    await vi.advanceTimersByTimeAsync(600);
    expect(completeSql).not.toHaveBeenCalled();

    const superseded = inlineProviders[0].provider.provideInlineCompletions(
      model,
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      createInlineToken(),
    );
    const replacement = inlineProviders[0].provider.provideInlineCompletions(
      model,
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      createInlineToken(),
    );
    expect(await superseded).toEqual({ items: [] });
    await vi.advanceTimersByTimeAsync(600);
    expect(completeSql).toHaveBeenCalledTimes(1);
    await replacement;

    disposable.dispose();
    completeSql.mockRestore();
    vi.useRealTimers();
  });

  it("settles immediately and does not schedule AI for a pre-cancelled token", async () => {
    vi.useFakeTimers();
    const inlineProviders: any[] = [];
    const completeSql = vi.spyOn(aiApi, "completeSql").mockResolvedValue({
      completion: " * FROM users",
    } as any);
    const monaco = createInlineMonaco(inlineProviders);
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
    );
    const token = createInlineToken();
    token.isCancellationRequested = true;

    const result = inlineProviders[0].provider.provideInlineCompletions(
      createInlineModel(() => 1),
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      token,
    );

    expect(await result).toEqual({ items: [] });
    await vi.runAllTimersAsync();
    expect(completeSql).not.toHaveBeenCalled();

    disposable.dispose();
    completeSql.mockRestore();
    vi.useRealTimers();
  });

  it("bounds and clears the inline completion cache", async () => {
    vi.useFakeTimers();
    const inlineProviders: any[] = [];
    const completeSql = vi.spyOn(aiApi, "completeSql").mockResolvedValue({
      completion: " * FROM users",
    } as any);
    const monaco = createInlineMonaco(inlineProviders);
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
    );
    const provider = inlineProviders[0].provider;

    for (let index = 0; index < 101; index++) {
      const request = provider.provideInlineCompletions(
        createInlineModel(() => 1, `SELECT ${index}`),
        { lineNumber: 1, column: 8 },
        { triggerKind: 1 },
        createInlineToken(),
      );
      await vi.advanceTimersByTimeAsync(600);
      await vi.runAllTimersAsync();
      await request;
    }
    const callsBeforeRepeat = completeSql.mock.calls.length;
    const repeatRequest = provider.provideInlineCompletions(
      createInlineModel(() => 1, "SELECT 0"),
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      createInlineToken(),
    );
    await vi.advanceTimersByTimeAsync(600);
    await vi.runAllTimersAsync();
    await repeatRequest;
    expect(completeSql.mock.calls.length).toBeGreaterThan(callsBeforeRepeat);

    provider.disposeInlineCompletions();
    const afterClear = provider.provideInlineCompletions(
      createInlineModel(() => 1, "SELECT 100"),
      { lineNumber: 1, column: 8 },
      { triggerKind: 1 },
      createInlineToken(),
    );
    await vi.advanceTimersByTimeAsync(600);
    await vi.runAllTimersAsync();
    await afterClear;
    expect(completeSql.mock.calls.length).toBe(callsBeforeRepeat + 2);

    disposable.dispose();
    completeSql.mockRestore();
    vi.useRealTimers();
  });

  it("isolates inline cache entries by the configured AI model", async () => {
    vi.useFakeTimers();
    const inlineProviders: any[] = [];
    const completeSql = vi.spyOn(aiApi, "completeSql").mockResolvedValue({
      completion: " * FROM users",
    } as any);
    const config = { modelId: "model-a", provider: "provider-a" };
    const monaco = createInlineMonaco(inlineProviders);
    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: [] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
      true,
      config,
    );
    const provider = inlineProviders[0].provider;
    const request = () =>
      provider.provideInlineCompletions(
        createInlineModel(() => 1),
        { lineNumber: 1, column: 8 },
        { triggerKind: 1 },
        createInlineToken(),
      );

    const firstRequest = request();
    await vi.advanceTimersByTimeAsync(600);
    await vi.runAllTimersAsync();
    await firstRequest;
    config.modelId = "model-b";
    const secondRequest = request();
    await vi.advanceTimersByTimeAsync(600);
    await vi.runAllTimersAsync();
    await secondRequest;

    expect(completeSql).toHaveBeenCalledTimes(2);
    expect(completeSql.mock.calls[1][0]).toMatchObject({ modelId: "model-b" });
    disposable.dispose();
    completeSql.mockRestore();
    vi.useRealTimers();
  });

  it("builds only punctuation trigger characters for every dialect", () => {
    expect(buildSqlTriggerCharacters(getSqlDialectCompletions("postgresql"))).toEqual([
      ".",
      '"',
      "`",
    ]);
  });

  it("ranks all SQL keywords above snippets, tables, and columns", () => {
    const completionProviders: any[] = [];
    const monaco = {
      Range: class Range {
        constructor(
          public startLineNumber: number,
          public startColumn: number,
          public endLineNumber: number,
          public endColumn: number,
        ) {}
      },
      languages: {
        CompletionItemKind: {
          Class: 1,
          Field: 2,
          Keyword: 3,
          Snippet: 4,
        },
        InlineCompletionTriggerKind: {
          Explicit: 1,
        },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
        registerInlineCompletionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
      },
    };

    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: ["users"] },
      { current: [{ table: "users", name: "id", type: "INTEGER" }] },
      "db-1",
      "public",
      "postgresql",
    );

    const sqlProvider = completionProviders.find(
      (entry) => entry.language === "sql",
    )?.provider;
    const suggestions = sqlProvider.provideCompletionItems(
      {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
        getVersionId: () => 1,
        getValueInRange: () => "s",
        getValue: () => "s",
      },
      { lineNumber: 1, column: 2 },
    ).suggestions;

    const keywordSuggestions = suggestions.filter(
      (item: any) => item.kind === monaco.languages.CompletionItemKind.Keyword,
    );
    const usersTable = suggestions.find(
      (item: any) =>
        item.label === "users" &&
        item.kind === monaco.languages.CompletionItemKind.Class,
    );

    expect(keywordSuggestions.length).toBeGreaterThan(0);
    expect(
      keywordSuggestions.every((item: any) =>
        item.sortText.startsWith("00_keyword_"),
      ),
    ).toBe(true);
    expect(
      keywordSuggestions.every(
        (item: any) => item.sortText < usersTable.sortText,
      ),
    ).toBe(true);
    expect(
      suggestions.every(
        (item: any) =>
          item.kind === monaco.languages.CompletionItemKind.Keyword ||
          keywordSuggestions[0].sortText < item.sortText,
      ),
    ).toBe(true);

    disposable.dispose();
  });

  it("returns keyword suggestions before matching table names", () => {
    const completionProviders: any[] = [];
    const monaco = {
      Range: class Range {
        constructor(
          public startLineNumber: number,
          public startColumn: number,
          public endLineNumber: number,
          public endColumn: number,
        ) {}
      },
      languages: {
        CompletionItemKind: {
          Class: 1,
          Field: 2,
          Keyword: 3,
          Snippet: 4,
        },
        InlineCompletionTriggerKind: {
          Explicit: 1,
        },
        registerCompletionItemProvider: vi.fn((language, provider) => {
          completionProviders.push({ language, provider });
          return { dispose: vi.fn() };
        }),
        registerInlineCompletionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
      },
    };

    const disposable = registerSqlAutocomplete(
      monaco as any,
      { current: ["sq_log_table"] },
      { current: [] },
      "db-1",
      "public",
      "postgresql",
    );

    const sqlProvider = completionProviders.find(
      (entry) => entry.language === "sql",
    )?.provider;
    const suggestions = sqlProvider.provideCompletionItems(
      {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }),
        getVersionId: () => 1,
        getValueInRange: () => "s",
        getValue: () => "s",
      },
      { lineNumber: 1, column: 2 },
    ).suggestions;

    expect(suggestions[0]).toMatchObject({
      label: "SELECT",
      kind: monaco.languages.CompletionItemKind.Keyword,
      sortText: "00_keyword_SELECT",
    });

    disposable.dispose();
  });
});
