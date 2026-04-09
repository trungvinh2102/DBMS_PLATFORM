/**
 * @file sql-autocomplete.ts
 * @description SQL completion provider for Monaco Editor.
 */

import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { aiApi } from "@/lib/api-client";

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "INSERT",
  "UPDATE",
  "DELETE",
  "LIMIT",
  "ORDER BY",
  "GROUP BY",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "ON",
  "AS",
  "DISTINCT",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "HAVING",
  "IN",
  "BETWEEN",
  "LIKE",
  "IS NULL",
  "IS NOT NULL",
  "UNION",
  "ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "AND",
  "OR",
  "NOT",
  "EXISTS",
  "CREATE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "INDEX",
  "VIEW",
  "TRIGGER",
  "PROCEDURE",
  "FUNCTION",
  // ClickHouse Specific
  "ENGINE", "MERGETREE", "SUMMINGMERGETREE", "REPLACINGMERGETREE", "AGGREGATINGMERGETREE",
  "COLLAPSINGMERGETREE", "VERSIONEDCOLLAPSINGMERGETREE", "TINYLOG", "LOG", "STRIPELOG",
  "MATERIALIZED", "EPHEMERAL", "ALIAS", "TTL", "SETTINGS", "FORMAT",
  "UNIQ", "UNIQCOMBINED", "UNIQEXACT", "QUANTILES", "GROUPARRAY", "GROUPUNIQARRAY",
  "ARRAYMAP", "ARRAYFILTER", "ARRAYJOIN",
  // DuckDB Specific
  "EXCLUDE", "REPLACE", "COLUMNS", "PIVOT", "UNPIVOT", "SUMMARIZE", "ASOF",
  "INSTALL", "LOAD", "PRAGMA", "ATTACH", "DETACH", "MACRO", "COPY",
  "read_csv_auto", "read_parquet", "parquet_schema", "read_json_auto",
  // Oracle Specific
  "DUAL", "ROWNUM", "SYSDATE", "TO_DATE", "TO_CHAR", "TO_NUMBER", "DECODE", "NVL",
  "NVL2", "COALESCE", "MERGE", "MATCHED", "CONNECT BY", "START WITH", "PRIOR",
  "VARCHAR2", "NUMBER", "CLOB", "BLOB", "DBMS_OUTPUT.PUT_LINE", "BEGIN", "EXCEPTION"
];



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

export const registerSqlAutocomplete = (
  monaco: Monaco,
  tablesRef: React.MutableRefObject<string[]>,
  columnsRef: React.MutableRefObject<
    Array<{ table: string; name: string; type: string }>
  >,
  databaseId?: string,
  schemaId?: string
) => {
  const disposables: monacoEditor.IDisposable[] = [];

  disposables.push(monaco.languages.registerCompletionItemProvider("sql", {
    triggerCharacters: [".", '"'],
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

      // Table.column or Alias.column completion
      const match = textUntilPosition.match(/([a-zA-Z0-9_]+)\.$/);
      if (match) {
        const prefix = match[1];
        let targetTable = prefix;

        // Check if prefix is an alias
        const aliases = extractTableAliases(fullText);
        if (aliases[prefix]) {
          targetTable = aliases[prefix];
        }

        const filteredColumns = columnsRef.current.filter(
          (col) => col.table.toLowerCase() === targetTable.toLowerCase(),
        );

        if (filteredColumns.length > 0) {
          return {
            suggestions: filteredColumns.map((col) => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: col.type,
              insertText: shouldQuote(col.name) ? `"${col.name}"` : col.name,
              range: range,
            })),
          };
        }
      }

      const duckdbSnippets = [
        { label: "read_csv_auto", insertText: "read_csv_auto('${1:path/to/file.csv}')" },
        { label: "read_parquet", insertText: "read_parquet('${1:path/to/file.parquet}')" },
        { label: "read_json_auto", insertText: "read_json_auto('${1:path/to/file.json}')" },
        { label: "parquet_schema", insertText: "parquet_schema('${1:path/to/file.parquet}')" },
        { label: "ATTACH", insertText: "ATTACH '${1:filename.duckdb}' AS ${2:alias};" }
      ];

      const oracleSnippets = [
        { label: "SELECT FROM DUAL", insertText: "SELECT ${1:*} FROM DUAL;" },
        { label: "sysdate", insertText: "SYSDATE" },
        { label: "rownum", insertText: "ROWNUM <= ${1:10}" },
        { label: "FETCH FIRST", insertText: "FETCH FIRST ${1:10} ROWS ONLY" },
        { label: "TO_DATE", insertText: "TO_DATE('${1:2024-01-01}', '${2:YYYY-MM-DD}')" },
        { label: "TO_CHAR", insertText: "TO_CHAR('${1:value}', '${2:format}')" },
        { label: "CONNECT BY PRIOR", insertText: "START WITH ${1:condition}\nCONNECT BY PRIOR ${2:parent_id} = ${3:id};" },
        { label: "MERGE INTO", insertText: "MERGE INTO ${1:target_table} t\nUSING ${2:source_table} s\nON (t.${3:id} = s.${4:id})\nWHEN MATCHED THEN\n  UPDATE SET ${5:t.col = s.col}\nWHEN NOT MATCHED THEN\n  INSERT (${6:cols}) VALUES (${7:vals});" },
        { label: "PL/SQL BLOCK", insertText: "DECLARE\n  ${1:v_var} ${2:VARCHAR2(100)};\nBEGIN\n  ${3:-- logic}\nEXCEPTION\n  WHEN OTHERS THEN\n    DBMS_OUTPUT.PUT_LINE(SQLERRM);\nEND;" }
      ];

      const suggestions: any[] = [
        ...duckdbSnippets.map((snip) => ({
          label: snip.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertTextRules: 4, // InsertAsSnippet
          insertText: snip.insertText,
          documentation: "DuckDB Snippet",
          range: range,
          sortText: "0",
        })),
        ...oracleSnippets.map((snip) => ({
          label: snip.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertTextRules: 4,
          insertText: snip.insertText,
          documentation: "Oracle Snippet",
          range: range,
          sortText: "0",
        })),
        ...SQL_KEYWORDS.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range: range,
          sortText: "1",
        })),
        ...tablesRef.current.map((table) => ({
          label: table,
          kind: monaco.languages.CompletionItemKind.Class,
          documentation: `Table: ${table}`,
          insertText: shouldQuote(table) ? `"${table}"` : table,
          range: range,
          sortText: "2",
        })),
        ...columnsRef.current.map((col) => {
          const quotedName = shouldQuote(col.name) ? `"${col.name}"` : col.name;
          return {
            label: `${col.table}.${col.name}`,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: `${col.table} (${col.type})`,
            documentation: `Column: ${col.name} in ${col.table}`,
            insertText: quotedName,
            range: range,
            sortText: "3",
            // Also allow matching just by name
            filterText: `${col.name} ${col.table}.${col.name}`,
          };
        }),
      ];

      return { suggestions };
    },
  }));

  // Inline AI Autocomplete Provider
  let timeout: any = null;
  let currentRequestObj: AbortController | null = null;
  let lastModelVersion = -1;

  disposables.push(monaco.languages.registerInlineCompletionsProvider("sql", {
    provideInlineCompletions: async (
      model: monacoEditor.editor.ITextModel,
      position: monacoEditor.Position,
      context: monacoEditor.languages.InlineCompletionContext,
      token: monacoEditor.CancellationToken
    ) => {
      if (!databaseId) return { items: [] };

      // We only want to trigger on explicit invoke or after typing (not constantly on every cursor move)
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1, startColumn: 1,
        endLineNumber: position.lineNumber, endColumn: position.column
      });
      
      const textAfterPosition = model.getValueInRange({
        startLineNumber: position.lineNumber, startColumn: position.column,
        endLineNumber: model.getLineCount(), endColumn: model.getLineMaxColumn(model.getLineCount())
      });

      // Avoid triggering on empty documents
      if (textUntilPosition.trim().length < 5) return { items: [] };

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
            const res = await aiApi.completeSql({
              databaseId,
              schema: schemaId || "public",
              prefix: textUntilPosition,
              suffix: textAfterPosition
            });

            if (abortController.signal.aborted || token.isCancellationRequested) {
              return resolve({ items: [] });
            }

            const completionText = (res as any).completion;
            if (completionText) {
              resolve({
                items: [{
                  insertText: completionText,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  )
                }]
              });
            } else {
              resolve({ items: [] });
            }
          } catch (err) {
            resolve({ items: [] });
          }
        }, 500); // Debounce duration
      });
    },
    freeInlineCompletions() {}
  }));

  return {
    dispose: () => {
      disposables.forEach(d => d.dispose());
    }
  };
};

