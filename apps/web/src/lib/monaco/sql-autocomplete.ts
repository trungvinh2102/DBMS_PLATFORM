/**
 * @file sql-autocomplete.ts
 * @description SQL completion provider for Monaco Editor.
 */

import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { aiApi } from "@/lib/api-client";
import { getSqlDialectCompletions } from "./sql-dialect-completions";
import {
  AI_COMPLETION_CACHE_TTL_MS,
  AI_COMPLETION_DEBOUNCE_MS,
  sanitizeInlineSqlCompletion,
  shouldRequestInlineSqlCompletion,
  trimInlineCompletionContext,
} from "./sql-inline-ai-completion";

interface InlineCompletionCacheEntry {
  completion: string;
  expiresAt: number;
}

export interface SqlInlineAiConfig {
  provider?: string;
  modelId?: string;
  revision?: string | number;
}

interface SqlColumnCompletion {
  table?: string | null;
  tableName?: string | null;
  table_name?: string | null;
  name?: string | null;
  columnName?: string | null;
  column_name?: string | null;
  type?: string | null;
  dataType?: string | null;
  data_type?: string | null;
}

export interface SqlColumnCompletionParts {
  tableName: string;
  columnName: string;
  columnType: string;
  label: string;
  filterText: string;
}

/**
 * Parses table aliases from SQL text.
 * Matches: FROM table alias, FROM table AS alias, JOIN table alias, JOIN table AS alias
 */
/**
 * Tokenizer-based alias extraction for better robustness.
 */
const extractTableAliases = (sql: string): Record<string, string> => {
  const aliases: Record<string, string> = {};

  // Simplified tokenizer: splits by whitespace and symbols, keeping relevant parts
  // We want to process the stream of tokens to find "FROM <table> [AS] <alias>" or "JOIN <table> [AS] <alias>"

  // Clean comments first (simple block and line comments)
  // Note: This is a basic cleanup, might not handle strings containing comment markers perfectly, but good enough for autocomplete
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ") // Block comments
    .replace(/--.*$/gm, " "); // Line comments

  // Split into tokens, preserving quoted strings or treating them as units
  // Matching: quoted strings, special chars, or words
  // identifiers: [a-zA-Z0-9_]+ or "..." or `...` or [...]
  const tokens =
    cleanSql.match(/([a-zA-Z0-9_]+)|(["`\[][^"`\]]+["`\]])|(\.)|(,)/g) || [];

  const KEYWORDS = new Set([
    "WHERE",
    "ON",
    "LIMIT",
    "GROUP",
    "ORDER",
    "BY",
    "HAVING",
    "LEFT",
    "RIGHT",
    "INNER",
    "OUTER",
    "CROSS",
    "JOIN",
    "UNION",
    "EXCEPT",
    "INTERSECT",
    "FULL",
    "USING",
    "SELECT",
    "FROM",
    "AND",
    "OR",
    "ASC",
    "DESC",
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toUpperCase();

    if (token === "FROM" || token === "JOIN") {
      // Expect Table Next
      // Skip potential "OUTER", "INNER", "LEFT", "RIGHT", "CROSS", "FULL" before "JOIN" was handled?
      // Actually if we hit "JOIN", the next thing MUST be the table (or subquery parenthesis - ignoring subqueries for now)

      let nextIdx = i + 1;
      if (nextIdx >= tokens.length) break;

      let tableName = tokens[nextIdx];
      let fullTableName = tableName;

      // Handle schema.table
      if (nextIdx + 2 < tokens.length && tokens[nextIdx + 1] === ".") {
        const schema = tableName;
        const dot = tokens[nextIdx + 1];
        const table = tokens[nextIdx + 2];
        fullTableName = `${schema}.${table}`;
        tableName = table; // We mainly care about the table name part for matching columns
        nextIdx += 2;
      }

      // Check if table name is actually a keyword (e.g. invalid SQL or unfinished)
      if (KEYWORDS.has(fullTableName.toUpperCase())) continue;

      // Clean table name
      const cleanTableName = tableName.replace(/["`\[\]]/g, "");

      // Look for Alias
      // Next token could be "AS", or the alias, or a keyword (start of next clause), or comma
      let aliasIdx = nextIdx + 1;
      if (aliasIdx >= tokens.length) continue;

      let potentialAlias = tokens[aliasIdx];

      // Handle optional AS
      if (potentialAlias.toUpperCase() === "AS") {
        aliasIdx++;
        if (aliasIdx >= tokens.length) continue;
        potentialAlias = tokens[aliasIdx];
      }

      // Check if potential alias is valid
      if (
        !KEYWORDS.has(potentialAlias.toUpperCase()) &&
        !["=", "<", ">", "(", ")", ";", ",", "."].includes(potentialAlias)
      ) {
        // Valid alias found
        aliases[potentialAlias] = cleanTableName;
      }
    }
  }

  return aliases;
};

const shouldQuote = (name: string): boolean => {
  return !/^[a-z0-9_]+$/.test(name);
};

const cleanMetadataValue = (value: unknown): string =>
  String(value ?? "").trim();

export const getSqlColumnCompletionParts = (
  column: SqlColumnCompletion,
): SqlColumnCompletionParts | null => {
  const tableName = cleanMetadataValue(
    column.table ?? column.tableName ?? column.table_name,
  );
  const columnName = cleanMetadataValue(
    column.name ?? column.columnName ?? column.column_name,
  );
  const columnType = cleanMetadataValue(
    column.type ?? column.dataType ?? column.data_type,
  );

  if (!columnName) return null;

  const label = tableName ? `${tableName}.${columnName}` : columnName;
  return {
    tableName,
    columnName,
    columnType,
    label,
    filterText: tableName ? `${columnName} ${label}` : columnName,
  };
};

const buildInlineCompletionCacheKey = (
  databaseId: string,
  schemaId: string | undefined,
  aiConfig: SqlInlineAiConfig | undefined,
  prefix: string,
  suffix: string,
): string =>
  [
    databaseId,
    schemaId || "",
    aiConfig?.provider || "",
    aiConfig?.modelId || "",
    aiConfig?.revision ?? "",
    prefix,
    suffix,
  ].join("\u0000");

const toInlineCompletionItems = (
  monaco: Monaco,
  position: monacoEditor.Position,
  completion: string,
) => ({
  items: [
    {
      insertText: completion,
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column,
      ),
    },
  ],
});

const MAX_COLUMN_SUGGESTIONS = 80;

export const buildSqlTriggerCharacters = (
  completions: ReturnType<typeof getSqlDialectCompletions>,
): string[] => {
  return [".", '"', "`"];
};

const isSqlIdentifierCharacter = (text: string): boolean =>
  /[a-zA-Z0-9_]/.test(text);

const shouldTriggerSqlSuggestForInput = (
  text: string,
  previousCharacter?: string,
): boolean => {
  if (text.length !== 1) return false;
  if (text === "." || text === '"' || text === "`") return true;
  if (!isSqlIdentifierCharacter(text)) return false;
  return !previousCharacter || !isSqlIdentifierCharacter(previousCharacter);
};

export const registerSqlSuggestOnTyping = (
  editor: monacoEditor.editor.IStandaloneCodeEditor,
): monacoEditor.IDisposable =>
  editor.onDidChangeModelContent((event) => {
    if (event.changes.length !== 1) return;
    const change = event.changes[0];
    const lineContent = editor
      .getModel?.()
      ?.getLineContent(change.range?.startLineNumber ?? 1);
    const previousCharacter = lineContent?.charAt(
      (change.range?.startColumn ?? 1) - 2,
    );

    if (!shouldTriggerSqlSuggestForInput(change.text, previousCharacter))
      return;

    editor.trigger(
      "quriodb.sql-autocomplete",
      "editor.action.triggerSuggest",
      {},
    );
  });

export const registerSqlAutocomplete = (
  monaco: Monaco,
  tablesRef: React.MutableRefObject<string[]>,
  columnsRef: React.MutableRefObject<SqlColumnCompletion[]>,
  databaseId?: string,
  schemaId?: string,
  dialect?: string,
  enableInlineAi = false,
  inlineAiConfig?: SqlInlineAiConfig,
  metadataRevisionRef?: { current: number },
) => {
  const disposables: monacoEditor.IDisposable[] = [];
  const dialectCompletions = getSqlDialectCompletions(dialect);
  let cachedColumnsSource: SqlColumnCompletion[] | null = null;
  let cachedColumnsLength = -1;
  let cachedFirstColumn: SqlColumnCompletion | undefined;
  let cachedLastColumn: SqlColumnCompletion | undefined;
  let cachedMetadataRevision: number | undefined;
  let cachedNormalizedColumns: SqlColumnCompletionParts[] = [];
  const aliasCache = new WeakMap<
    monacoEditor.editor.ITextModel,
    { versionId: number; aliases: Record<string, string> }
  >();

  disposables.push(
    monaco.languages.registerCompletionItemProvider("sql", {
      triggerCharacters: buildSqlTriggerCharacters(dialectCompletions),
      provideCompletionItems: (
        model: monacoEditor.editor.ITextModel,
        position: monacoEditor.Position,
      ) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const fullText = model.getValue();

        const columns = columnsRef.current;
          if (
            columns !== cachedColumnsSource ||
            columns.length !== cachedColumnsLength ||
            columns[0] !== cachedFirstColumn ||
            columns[columns.length - 1] !== cachedLastColumn ||
            metadataRevisionRef?.current !== cachedMetadataRevision
          ) {
          cachedColumnsSource = columns;
          cachedColumnsLength = columns.length;
            cachedFirstColumn = columns[0];
            cachedLastColumn = columns[columns.length - 1];
            cachedMetadataRevision = metadataRevisionRef?.current;
          cachedNormalizedColumns = columns
            .map(getSqlColumnCompletionParts)
            .filter((col): col is SqlColumnCompletionParts => Boolean(col));
        }
        const normalizedColumns = cachedNormalizedColumns;

        // Table.column or Alias.column completion
        const match = textUntilPosition.match(/([a-zA-Z0-9_]+)\.$/);
        if (match) {
          const prefix = match[1];
          let targetTable = prefix;

          // Check if prefix is an alias — cache by model identity and version
          const versionId = model.getVersionId();
          const cachedModelAliases = aliasCache.get(model);
          if (!cachedModelAliases || cachedModelAliases.versionId !== versionId) {
            aliasCache.set(model, {
              versionId,
              aliases: extractTableAliases(fullText),
            });
          }
          const aliases = aliasCache.get(model)?.aliases;
          if (aliases?.[prefix]) {
            targetTable = aliases[prefix];
          }

          const filteredColumns = normalizedColumns.filter(
            (col) =>
              col.tableName &&
              col.tableName.toLowerCase() === targetTable.toLowerCase(),
          );

          if (filteredColumns.length > 0) {
            return {
              suggestions: filteredColumns.map((col) => ({
                label: col.columnName,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: col.columnType,
                insertText: shouldQuote(col.columnName)
                  ? `"${col.columnName}"`
                  : col.columnName,
                range: range,
              })),
            };
          }
        }

        const tableCount = tablesRef.current.length;

        // Limit column suggestions based on schema size to keep UI responsive
        const columnSuggestions = normalizedColumns.slice(
          0,
          tableCount > 20
            ? Math.min(MAX_COLUMN_SUGGESTIONS, normalizedColumns.length)
            : normalizedColumns.length,
        );

        const suggestions: any[] = [
          ...dialectCompletions.keywords.map((keyword) => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range: range,
            sortText: `00_keyword_${keyword}`,
            preselect: keyword === "SELECT",
          })),
          ...dialectCompletions.snippets.map((snip) => ({
            label: snip.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertTextRules: 4, // InsertAsSnippet
            insertText: snip.insertText,
            documentation: snip.documentation,
            range: range,
            sortText: `10_snippet_${snip.label}`,
          })),
          ...tablesRef.current.map((table) => ({
            label: table,
            kind: monaco.languages.CompletionItemKind.Class,
            documentation: `Table: ${table}`,
            insertText: shouldQuote(table) ? `"${table}"` : table,
            range: range,
            sortText: `20_table_${table}`,
          })),
          ...columnSuggestions.map((col) => {
            const quotedName = shouldQuote(col.columnName)
              ? `"${col.columnName}"`
              : col.columnName;
            return {
              label: col.label,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: col.tableName
                ? `${col.tableName} (${col.columnType})`
                : col.columnType,
              documentation: col.tableName
                ? `Column: ${col.columnName} in ${col.tableName}`
                : `Column: ${col.columnName}`,
              insertText: quotedName,
              range: range,
              sortText: `30_column_${col.label}`,
              filterText: col.filterText,
            };
          }),
        ];

        return { suggestions };
      },
    }),
  );

  const MAX_INLINE_COMPLETION_CACHE_ENTRIES = 100;
  type InlineCompletionResult = { items: any[] };
  type InlineRequest = {
    id: number;
    resolve: (result: InlineCompletionResult) => void;
    timeout: ReturnType<typeof setTimeout> | null;
    controller: AbortController | null;
    cancellationDisposable: { dispose: () => void } | null;
    settled: boolean;
  };
  let currentRequest: InlineRequest | null = null;
  let requestId = 0;
  let disposed = false;
  const completionCache = new Map<string, InlineCompletionCacheEntry>();

  const settleRequest = (request: InlineRequest, result: InlineCompletionResult) => {
    if (request.settled) return;
    request.settled = true;
    if (request.timeout) {
      clearTimeout(request.timeout);
      request.timeout = null;
    }
    request.cancellationDisposable?.dispose();
    request.cancellationDisposable = null;
    if (currentRequest === request) currentRequest = null;
    request.resolve(result);
  };

  const cancelCurrentRequest = () => {
    if (!currentRequest) return;
    const request = currentRequest;
    request.controller?.abort();
    settleRequest(request, { items: [] });
  };

  const cacheInlineCompletion = (key: string, completion: string) => {
    completionCache.delete(key);
    while (completionCache.size >= MAX_INLINE_COMPLETION_CACHE_ENTRIES) {
      const oldestKey = completionCache.keys().next().value;
      if (oldestKey === undefined) break;
      completionCache.delete(oldestKey);
    }
    completionCache.set(key, {
      completion,
      expiresAt: Date.now() + AI_COMPLETION_CACHE_TTL_MS,
    });
  };

  if (enableInlineAi) {
    disposables.push(
      monaco.languages.registerInlineCompletionsProvider("sql", {
        provideInlineCompletions: async (
          model: monacoEditor.editor.ITextModel,
          position: monacoEditor.Position,
          context: monacoEditor.languages.InlineCompletionContext,
          token: monacoEditor.CancellationToken,
        ) => {
          if (disposed || !databaseId) return { items: [] };
          if (token.isCancellationRequested) return { items: [] };
          cancelCurrentRequest();

          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const textAfterPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: model.getLineCount(),
            endColumn: model.getLineMaxColumn(model.getLineCount()),
          });

          const currentLinePrefix = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const nextCharacter = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: Math.min(
              position.column + 1,
              model.getLineMaxColumn(position.lineNumber),
            ),
          });

          const isExplicit =
            context.triggerKind ===
            monaco.languages.InlineCompletionTriggerKind.Explicit;
          if (
            !shouldRequestInlineSqlCompletion({
              prefix: textUntilPosition,
              currentLinePrefix,
              nextCharacter,
              isExplicit,
            })
          ) {
            return { items: [] };
          }

          const trimmedContext = trimInlineCompletionContext(
            textUntilPosition,
            textAfterPosition,
          );
          const cacheKey = buildInlineCompletionCacheKey(
            databaseId,
            schemaId,
            inlineAiConfig,
            trimmedContext.prefix,
            trimmedContext.suffix,
          );
          const cached = completionCache.get(cacheKey);
          if (cached && cached.expiresAt > Date.now()) {
            completionCache.delete(cacheKey);
            completionCache.set(cacheKey, cached);
            return toInlineCompletionItems(monaco, position, cached.completion);
          }
          if (cached) completionCache.delete(cacheKey);

          return new Promise((resolve) => {
            const modelVersionId = model.getVersionId();
            const configKey = buildInlineCompletionCacheKey(
              databaseId,
              schemaId,
              inlineAiConfig,
              "",
              "",
            );
            const request: InlineRequest = {
              id: ++requestId,
              resolve,
              timeout: null,
              controller: null,
              cancellationDisposable: null,
              settled: false,
            };
            currentRequest = request;

            request.cancellationDisposable = token.onCancellationRequested(() => {
              if (currentRequest === request) {
                request.controller?.abort();
                settleRequest(request, { items: [] });
              }
            });

            request.timeout = setTimeout(async () => {
              request.timeout = null;
              if (
                disposed ||
                currentRequest !== request ||
                token.isCancellationRequested
              ) {
                return settleRequest(request, { items: [] });
              }
              // If model changed before timeout, cancel
              if (model.getVersionId() !== modelVersionId) {
                return settleRequest(request, { items: [] });
              }

              const abortController = new AbortController();
              request.controller = abortController;

              try {
                const res = await aiApi.completeSql(
                  {
                    databaseId,
                    schema_name: schemaId || "public",
                    prefix: trimmedContext.prefix,
                    suffix: trimmedContext.suffix,
                    ...(inlineAiConfig?.modelId
                      ? { modelId: inlineAiConfig.modelId }
                      : {}),
                  },
                  abortController.signal,
                );

                if (
                  disposed ||
                  currentRequest !== request ||
                  abortController.signal.aborted ||
                  token.isCancellationRequested ||
                  model.getVersionId() !== modelVersionId ||
                  buildInlineCompletionCacheKey(
                    databaseId,
                    schemaId,
                    inlineAiConfig,
                    "",
                    "",
                  ) !== configKey
                ) {
                  return settleRequest(request, { items: [] });
                }

                const completionText = sanitizeInlineSqlCompletion(
                  textUntilPosition,
                  (res as any).completion,
                );
                if (completionText) {
                  cacheInlineCompletion(cacheKey, completionText);
                  settleRequest(
                    request,
                    toInlineCompletionItems(monaco, position, completionText),
                  );
                } else {
                  settleRequest(request, { items: [] });
                }
              } catch (err) {
                settleRequest(request, { items: [] });
              }
            }, AI_COMPLETION_DEBOUNCE_MS);
          });
        },
        disposeInlineCompletions() {
          cancelCurrentRequest();
          completionCache.clear();
        },
      }),
    );
  }

  return {
    dispose: () => {
      disposed = true;
      cancelCurrentRequest();
      completionCache.clear();
      disposables.forEach((d) => d.dispose());
    },
  };
};
