/**
 * @file sql-editor.tsx
 * @description Monaco-based SQL editor component with custom themes, hotkey support,
 * and real-time syntax validation.
 *
 * ## Features:
 * - SQL syntax highlighting with custom themes
 * - Real-time syntax validation with visual markers
 * - Auto-completion for tables, columns, and SQL keywords
 * - Hotkey support (Ctrl+Enter to run, Ctrl+F to format, etc.)
 * - Dark/light theme support
 */

"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useEditorValidation } from "@/lib/monaco/useEditorValidation";
import { ErrorPanel } from "@/lib/monaco/ErrorPanel";
import type { ValidationOptions } from "@/lib/monaco/types";

// ============================================================================
// TYPES
// ============================================================================

interface SQLEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onPositionChange?: (position: { lineNumber: number; column: number }) => void;
  onRun?: () => void;
  onFormat?: () => void;
  onStop?: () => void;
  tabSize?: number;
  tables?: string[];
  columns?: Array<{ table: string; name: string; type: string }>;
  undoTrigger?: number;
  redoTrigger?: number;
  /** Enable/disable syntax validation (default: true) */
  enableValidation?: boolean;
  /** Show/hide error panel below editor (default: false - shown in south pane instead) */
  showErrorPanel?: boolean;
  /** SQL dialect for validation (default: 'postgresql') */
  sqlDialect?: "mysql" | "postgresql" | "sqlite" | "mariadb" | "bigquery";
  /** Validation debounce delay in ms (default: 300) */
  validationDebounceMs?: number;
  /** Callback when validation errors change */
  onValidationChange?: (errorCount: number, warningCount: number) => void;
  /** Callback to expose validation errors array to parent */
  onErrorsChange?: (
    errors: Array<{
      id: string;
      line: number;
      column: number;
      endLine: number;
      endColumn: number;
      message: string;
      severity: number;
      severityLabel: string;
    }>,
  ) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SQLEditor({
  value,
  onChange,
  onPositionChange,
  onRun,
  onFormat,
  onStop,
  tabSize = 4,
  tables = [],
  columns = [],
  undoTrigger = 0,
  redoTrigger = 0,
  enableValidation = true,
  showErrorPanel = false, // Default false - errors shown in south pane
  sqlDialect = "postgresql",
  validationDebounceMs = 300,
  onValidationChange,
  onErrorsChange,
}: SQLEditorProps) {
  // ============================================================================
  // THEME
  // ============================================================================

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  // ============================================================================
  // REFS
  // ============================================================================

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<Monaco | null>(null);
  const tablesRef = useRef<string[]>(tables);
  const columnsRef =
    useRef<Array<{ table: string; name: string; type: string }>>(columns);

  // Use refs for handlers to avoid stale closures in Monaco commands
  const onRunRef = useRef(onRun);
  const onFormatRef = useRef(onFormat);
  const onStopRef = useRef(onStop);

  // ============================================================================
  // STATE
  // ============================================================================

  const [mounted, setMounted] = useState(false);

  // ============================================================================
  // VALIDATION HOOK
  // ============================================================================

  // Memoize validationOptions to prevent infinite re-renders
  const validationOptions: ValidationOptions = useMemo(
    () => ({ sqlDialect }),
    [sqlDialect],
  );

  const {
    errors,
    errorCount,
    warningCount,
    isValid,
    isValidating,
    validate,
    clearMarkers,
  } = useEditorValidation({
    monacoRef,
    editorRef,
    language: "sql",
    debounceMs: validationDebounceMs,
    validationOptions,
    enabled: enableValidation,
    markerId: "sql-syntax-validator",
    onValidationComplete: (result) => {
      const errors = result.markers.filter((m) => m.severity === 8).length;
      const warnings = result.markers.filter((m) => m.severity === 4).length;
      onValidationChange?.(errors, warnings);
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update refs when handlers change
  useEffect(() => {
    onRunRef.current = onRun;
    onFormatRef.current = onFormat;
    onStopRef.current = onStop;
  }, [onRun, onFormat, onStop]);

  // Update tables ref
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  // Update columns ref
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Update theme dynamically
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(
        currentTheme === "dark" ? "querypie-dark" : "querypie-light",
      );
    }
  }, [currentTheme]);

  // Handle undo trigger
  useEffect(() => {
    if (undoTrigger > 0 && editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("keyboard", "undo", null);
    }
  }, [undoTrigger]);

  // Handle redo trigger
  useEffect(() => {
    if (redoTrigger > 0 && editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("keyboard", "redo", null);
    }
  }, [redoTrigger]);

  // Validate on value change
  useEffect(() => {
    if (mounted && enableValidation) {
      validate(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mounted, enableValidation]);

  // Re-validate when dialect changes
  useEffect(() => {
    if (mounted && enableValidation) {
      clearMarkers();
      // Use setTimeout to avoid blocking
      const timer = setTimeout(() => validate(value), 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqlDialect, mounted, enableValidation]);

  // Notify parent when errors change
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle error click from error panel.
   * Navigates editor to the error location.
   */
  const handleErrorClick = useCallback((line: number, column: number) => {
    const editor = editorRef.current;
    if (editor) {
      // Move cursor to error position
      editor.setPosition({ lineNumber: line, column });
      // Focus the editor
      editor.focus();
      // Reveal the line
      editor.revealLineInCenter(line);
      // Highlight the line briefly
      const decoration = editor.deltaDecorations(
        [],
        [
          {
            range: {
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: 1000,
            },
            options: {
              isWholeLine: true,
              className: "error-line-highlight",
              glyphMarginClassName: "error-glyph",
            },
          },
        ],
      );

      // Remove highlight after 1 second
      setTimeout(() => {
        editor.deltaDecorations(decoration, []);
      }, 1000);
    }
  }, []);

  /**
   * Handle editor mount event.
   * Sets up themes, hotkeys, and autocomplete providers.
   */
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        onPositionChange?.({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // ========================================================================
      // DEFINE CUSTOM THEMES WITH ERROR HIGHLIGHTING
      // ========================================================================

      // Light theme
      monaco.editor.defineTheme("querypie-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "0033B3", fontStyle: "bold" },
          { token: "string", foreground: "067D17" },
          { token: "number", foreground: "1750EB" },
          { token: "comment", foreground: "8C8C8C", fontStyle: "italic" },
        ],
        colors: {
          "editor.background": "#FFFFFF",
          "editor.lineHighlightBackground": "#F5F8FF",
          "editorCursor.foreground": "#000000",
          "editor.selectionBackground": "#B3D7FF",
          "editorIndentGuide.background": "#F0F0F0",
          "editorLineNumber.foreground": "#A0A0A0",
          "editorLineNumber.activeForeground": "#000000",
          // Error highlighting colors
          "editorError.foreground": "#E51400",
          "editorError.border": "#E51400",
          "editorWarning.foreground": "#BF8803",
          "editorWarning.border": "#BF8803",
          "editorGutter.background": "#FFFFFF",
          "editorOverviewRuler.errorForeground": "#E51400",
          "editorOverviewRuler.warningForeground": "#BF8803",
        },
      });

      // Dark theme with error highlighting
      monaco.editor.defineTheme("querypie-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "comment", foreground: "6A9955", fontStyle: "italic" },
          { token: "identifier", foreground: "DCDCAA" },
          { token: "type", foreground: "4EC9B0" },
        ],
        colors: {
          "editor.background": "#050505",
          "editor.foreground": "#CCCCCC",
          "editor.lineHighlightBackground": "#1A1A1A",
          "editorCursor.foreground": "#FFFFFF",
          "editor.selectionBackground": "#264F7880",
          "editorIndentGuide.background": "#252525",
          "editorLineNumber.foreground": "#5A5A5A",
          "editorLineNumber.activeForeground": "#CCCCCC",
          "editor.selectionHighlightBackground": "#ADD6FF26",
          // Error highlighting colors
          "editorError.foreground": "#F14C4C",
          "editorError.border": "#F14C4C",
          "editorWarning.foreground": "#CCA700",
          "editorWarning.border": "#CCA700",
          "editorGutter.background": "#050505",
          "editorOverviewRuler.errorForeground": "#F14C4C",
          "editorOverviewRuler.warningForeground": "#CCA700",
        },
      });

      // Set initial theme
      monaco.editor.setTheme(
        currentTheme === "dark" ? "querypie-dark" : "querypie-light",
      );

      // ========================================================================
      // REGISTER HOTKEYS
      // ========================================================================

      // Ctrl+Enter to run
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRunRef.current?.();
      });

      // Ctrl+F to format (override default find)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        onFormatRef.current?.();
      });

      // Ctrl+Shift+X to stop
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX,
        () => {
          onStopRef.current?.();
        },
      );

      // Alt+Shift+F for format (alternative)
      editor.addCommand(
        monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        () => {
          onFormatRef.current?.();
        },
      );

      // ========================================================================
      // REGISTER SQL AUTOCOMPLETE PROVIDER
      // ========================================================================

      monaco.languages.registerCompletionItemProvider("sql", {
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

          // Check if we just typed a dot after a table name
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

          // Build suggestions
          const suggestions = [
            // Table suggestions
            ...tablesRef.current.map((table) => ({
              label: table,
              kind: monaco.languages.CompletionItemKind.Class,
              documentation: `Table: ${table}`,
              insertText: table,
              range: range,
            })),
            // Column suggestions with table prefix
            ...columnsRef.current.map((col) => ({
              label: `${col.table}.${col.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${col.table} (${col.type})`,
              documentation: `Column: ${col.name} in table ${col.table}`,
              insertText: col.name,
              range: range,
              sortText: "001",
            })),
            // Direct column names
            ...columnsRef.current.map((col) => ({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${col.table} (${col.type})`,
              insertText: col.name,
              range: range,
              sortText: "002",
            })),
            // SQL Keywords
            ...[
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
            ].map((keyword) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range: range,
            })),
          ];

          return { suggestions };
        },
      });

      // Mark as mounted
      setMounted(true);
    },
    [currentTheme, onPositionChange],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="sql-editor-container">
      {/* Monaco Editor */}
      <div className="editor-area">
        <Editor
          height="100%"
          defaultLanguage="sql"
          theme={currentTheme === "dark" ? "querypie-dark" : "querypie-light"}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            tabSize: tabSize,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontWeight: "500",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            lineNumbers: "on",
            renderLineHighlight: "all",
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            lineHeight: 20,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            contextmenu: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            suggestOnTriggerCharacters: true,
            parameterHints: { enabled: true },
            fontLigatures: true,
            // Enable glyph margin for error icons
            glyphMargin: enableValidation,
            // Show error squiggles
            renderValidationDecorations: "on",
          }}
        />
      </div>

      {/* Error Panel */}
      {showErrorPanel && enableValidation && errors.length > 0 && (
        <ErrorPanel
          errors={errors}
          onErrorClick={handleErrorClick}
          maxHeight={120}
          title="SQL Problems"
        />
      )}

      {/* Styles */}
      <style jsx>{`
        .sql-editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .editor-area {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        :global(.error-line-highlight) {
          background: rgba(255, 0, 0, 0.1) !important;
        }

        :global(.error-glyph) {
          background: #ef4444;
          border-radius: 50%;
          margin-left: 3px;
        }
      `}</style>
    </div>
  );
}
