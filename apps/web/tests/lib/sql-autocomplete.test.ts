import { describe, expect, it, vi } from "vitest";

import {
  getSqlColumnCompletionParts,
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

  it("treats `s` as a keyword trigger so SELECT syntax appears while typing", () => {
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
    expect(sqlProvider?.triggerCharacters).toContain("s");

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
