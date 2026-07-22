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
  prefix: string,
  suffix: string,
): string => [databaseId, schemaId || "", prefix, suffix].join("\u0000");

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

let aliasCacheVersionId = -1;
let cachedAliases: Record<string, string> = {};

const buildSqlTriggerCharacters = (
  completions: ReturnType<typeof getSqlDialectCompletions>,
): string[] => {
  const syntaxInitials = [
    ...completions.keywords,
    ...completions.snippets.map((snippet) => snippet.label),
  ].flatMap((label) => {
    const firstCharacter = label.trim().charAt(0);
    if (!/^[a-z]$/i.test(firstCharacter)) return [];
    return [firstCharacter.toLowerCase(), firstCharacter.toUpperCase()];
  });

  return Array.from(new Set([".", '"', ...syntaxInitials]));
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
) => {
  const disposables: monacoEditor.IDisposable[] = [];
  const dialectCompletions = getSqlDialectCompletions(dialect);

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

        const versionId = model.getVersionId();

        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const fullText = model.getValue();

        // Compute normalized columns once — avoid double iteration
        const normalizedColumns = columnsRef.current
          .map(getSqlColumnCompletionParts)
          .filter((col): col is SqlColumnCompletionParts => Boolean(col));

        // Table.column or Alias.column completion
        const match = textUntilPosition.match(/([a-zA-Z0-9_]+)\.$/);
        if (match) {
          const prefix = match[1];
          let targetTable = prefix;

          // Check if prefix is an alias — cache by model version
          if (versionId !== aliasCacheVersionId) {
            cachedAliases = extractTableAliases(fullText);
            aliasCacheVersionId = versionId;
          }
          if (cachedAliases[prefix]) {
            targetTable = cachedAliases[prefix];
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

  let timeout: any = null;
  let currentRequestObj: AbortController | null = null;
  const completionCache = new Map<string, InlineCompletionCacheEntry>();

  if (enableInlineAi) {
    disposables.push(
      monaco.languages.registerInlineCompletionsProvider("sql", {
        provideInlineCompletions: async (
          model: monacoEditor.editor.ITextModel,
          position: monacoEditor.Position,
          context: monacoEditor.languages.InlineCompletionContext,
          token: monacoEditor.CancellationToken,
        ) => {
          if (!databaseId) return { items: [] };

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
            trimmedContext.prefix,
            trimmedContext.suffix,
          );
          const cached = completionCache.get(cacheKey);
          if (cached && cached.expiresAt > Date.now()) {
            return toInlineCompletionItems(monaco, position, cached.completion);
          }

          return new Promise((resolve) => {
            if (timeout) clearTimeout(timeout);
            if (currentRequestObj) currentRequestObj.abort();

            const modelVersionId = model.getVersionId();

            token.onCancellationRequested(() => {
              if (currentRequestObj) currentRequestObj.abort();
              resolve({ items: [] });
            });

            timeout = setTimeout(async () => {
              // If model changed before timeout, cancel
              if (model.getVersionId() !== modelVersionId) {
                return resolve({ items: [] });
              }

              const abortController = new AbortController();
              currentRequestObj = abortController;

              try {
                const res = await aiApi.completeSql(
                  {
                    databaseId,
                    schema_name: schemaId || "public",
                    prefix: trimmedContext.prefix,
                    suffix: trimmedContext.suffix,
                  },
                  abortController.signal,
                );

                if (
                  abortController.signal.aborted ||
                  token.isCancellationRequested
                ) {
                  return resolve({ items: [] });
                }

                const completionText = sanitizeInlineSqlCompletion(
                  textUntilPosition,
                  (res as any).completion,
                );
                if (completionText) {
                  completionCache.set(cacheKey, {
                    completion: completionText,
                    expiresAt: Date.now() + AI_COMPLETION_CACHE_TTL_MS,
                  });
                  resolve(
                    toInlineCompletionItems(monaco, position, completionText),
                  );
                } else {
                  resolve({ items: [] });
                }
              } catch (err) {
                resolve({ items: [] });
              }
            }, AI_COMPLETION_DEBOUNCE_MS);
          });
        },
        disposeInlineCompletions() {},
      }),
    );
  }

  return {
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
};
