/**
 * @file sql-autocomplete.ts
 * @description SQL completion provider for Monaco Editor.
 */

import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";

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
];

export const registerSqlAutocomplete = (
  monaco: Monaco,
  tablesRef: React.MutableRefObject<string[]>,
  columnsRef: React.MutableRefObject<
    Array<{ table: string; name: string; type: string }>
  >,
) => {
  return monaco.languages.registerCompletionItemProvider("sql", {
    triggerCharacters: [" ", ".", '"'],
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

      // Table.column completion
      const match = textUntilPosition.match(/([a-zA-Z0-9_]+)\.$/);
      if (match) {
        const tableName = match[1];
        const filteredColumns = columnsRef.current.filter(
          (col) => col.table.toLowerCase() === tableName.toLowerCase(),
        );

        if (filteredColumns.length > 0) {
          return {
            suggestions: filteredColumns.map((col) => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: col.type,
              insertText: col.name,
              range: range,
            })),
          };
        }
      }

      const suggestions: any[] = [
        ...SQL_KEYWORDS.map((keyword) => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range: range,
          sortText: "1", // Highest priority
        })),
        ...tablesRef.current.map((table) => ({
          label: table,
          kind: monaco.languages.CompletionItemKind.Class, // or Class/Table
          documentation: `Table: ${table}`,
          insertText: table,
          range: range,
          sortText: "2", // Second priority
        })),
        ...columnsRef.current.map((col) => ({
          label: `${col.table}.${col.name}`,
          kind: monaco.languages.CompletionItemKind.Field,
          detail: `${col.table} (${col.type})`,
          documentation: `Column: ${col.name} in table ${col.table}`,
          insertText: col.name, // Insert just the name or table.name? Usually just name if context is right, or let user decide. Existing code inserted name.
          range: range,
          sortText: "3", // Third priority
        })),
        ...columnsRef.current.map((col) => ({
          label: col.name,
          kind: monaco.languages.CompletionItemKind.Field,
          detail: `${col.table} (${col.type})`,
          insertText: col.name,
          range: range,
          sortText: "4", // Lowest priority for bare column names to avoid noise? Or same as qualified?
        })),
      ];

      return { suggestions };
    },
  });
};
