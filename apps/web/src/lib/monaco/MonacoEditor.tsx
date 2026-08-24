/**
 * @file sql-editor.tsx
 * @description Monaco-based SQL editor component with custom themes, hotkey support,
 * and real-time syntax validation.
 */

"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useEditorValidation } from "@/lib/monaco/useEditorValidation";
import { useRevealPositionRequest } from "@/lib/monaco/useRevealPositionRequest";
import { ErrorPanel } from "@/lib/monaco/ErrorPanel";
import type { RevealPositionRequest, ValidationOptions } from "@/lib/monaco/types";
import { useSettingsStore } from "@/stores/use-settings-store";
import { defineThemes } from "@/lib/monaco/themes";
import {
  registerSqlAutocomplete,
  registerSqlSuggestOnTyping,
} from "@/lib/monaco/sql-autocomplete";
import { registerMongoAutocomplete } from "@/lib/monaco/mongodb-autocomplete";
import { registerRedisAutocomplete } from "@/lib/monaco/redis-autocomplete";
import { registerEditorCommands } from "../../app/sqllab/hooks/use-editor-commands";

/**
 * Metadata describing what a reported selection was made on. `ownerSql` is
 * the exact editor content at selection-event time; `sessionId` identifies
 * the editor mount that reported it. Consumers compare both against the
 * current context to reject stale deliveries synchronously.
 */
export interface SQLSelectionMeta {
  ownerSql: string;
  sessionId: string;
}

/**
 * Ownership intent for a Ctrl/Cmd+Enter run issued over a nonempty editor
 * selection. Frozen from the live Monaco model at keypress time so the
 * consumer can validate the override against the same synchronous boundary
 * used for stored selections (current tab/session + owning SQL content).
 */
export interface SQLKeyboardSelection extends SQLSelectionMeta {
  /** Exact selected text at keypress time (non-whitespace). */
  text: string;
}

interface SQLEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onPositionChange?: (position: { lineNumber: number; column: number }) => void;
  onSelectionChange?: (text: string, meta?: SQLSelectionMeta) => void;
  /** Identity of this editor mount; travels with selection reports. */
  selectionSessionId?: string;
  onRun?: (
    sql?: string,
    keyboardSelection?: SQLKeyboardSelection,
  ) => void;
  onFormat?: () => void;
  onStop?: () => void;
  onSave?: () => void;
  tabSize?: number;
  tables?: string[];
  columns?: SQLEditorColumn[];
  undoTrigger?: number;
  redoTrigger?: number;
  enableValidation?: boolean;
  showErrorPanel?: boolean;
  sqlDialect?:
    | "mysql"
    | "postgresql"
    | "sqlite"
    | "mariadb"
    | "bigquery"
    | "clickhouse";
  language?: string;
  databaseId?: string;
  schemaId?: string;
  validationDebounceMs?: number;
  onValidationChange?: (errorCount: number, warningCount: number) => void;
  onErrorsChange?: (errors: any[]) => void;
  revealRequest?: RevealPositionRequest | null;
}

/**
 * A single column entry accepted by the SQL editor for autocomplete metadata.
 * Mirrors the backend's all-columns payload, which may use either camelCase or
 * snake_case field names.
 */
export interface SQLEditorColumn {
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

/**
 * Keeps the Monaco autocomplete metadata refs and the metadata revision in sync
 * with the `tables`/`columns` props. The revision only advances when the
 * metadata actually changes: unrelated re-renders (SQL text, cursor movement)
 * never invalidate the SQL autocomplete cache, and parents that rebuild the
 * arrays with identical content do not bump the revision either.
 */
export function useSqlMetadataSync(
  tables: string[],
  columns: SQLEditorColumn[],
) {
  const tablesRef = useRef<string[]>(tables);
  const columnsRef = useRef<SQLEditorColumn[]>(columns);
  const metadataRevisionRef = useRef(0);

  // Sync refs
  useEffect(() => {
    const prevTables = tablesRef.current;
    const prevColumns = columnsRef.current;
    const tablesChanged =
      tables.length !== prevTables.length ||
      tables.some((name, index) => name !== prevTables[index]);
    const columnsChanged =
      columns.length !== prevColumns.length ||
      columns.some((column, index) => column !== prevColumns[index]);

    // Identity changed (the effect only fires on new `tables`/`columns`
    // references), but the content is identical to what is already synced.
    // Keep the refs and revision untouched so the autocomplete cache survives.
    if (!tablesChanged && !columnsChanged) return;

    metadataRevisionRef.current += 1;
    tablesRef.current = tables;
    columnsRef.current = columns;
  }, [tables, columns]);

  return { tablesRef, columnsRef, metadataRevisionRef };
}

export function SQLEditor({
  value,
  onChange,
  onPositionChange,
  onSelectionChange,
  selectionSessionId,
  onRun,
  onFormat,
  onStop,
  onSave,
  tables = [],
  columns = [],
  undoTrigger = 0,
  redoTrigger = 0,
  enableValidation = true,
  showErrorPanel = false,
  sqlDialect = "postgresql",
  language = "sql",
  databaseId,
  schemaId,
  validationDebounceMs = 300,
  onValidationChange,
  onErrorsChange,
  revealRequest,
}: SQLEditorProps) {
  const { resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || "light";
  const settings = useSettingsStore();

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<Monaco | null>(null);
  const autocompleteDisposablesRef = useRef<monacoEditor.IDisposable[]>([]);
  const { tablesRef, columnsRef, metadataRevisionRef } = useSqlMetadataSync(
    tables,
    columns,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    return () => {
      if (autocompleteDisposablesRef.current.length > 0) {
        autocompleteDisposablesRef.current.forEach((d) => d.dispose());
        autocompleteDisposablesRef.current = [];
      }
    };
  }, []);

  const validationOptions: ValidationOptions = useMemo(
    () => ({ sqlDialect }),
    [sqlDialect],
  );

  const isRelational = !["mongodb", "redis"].includes(sqlDialect);

  const { errors, validate, clearMarkers } = useEditorValidation({
    monacoRef,
    editorRef,
    language: language === "sql" ? "sql" : (language as any),
    debounceMs: validationDebounceMs,
    validationOptions,
    enabled: enableValidation && (language === "sql" || !isRelational),
    markerId: "sql-syntax-validator",
    onValidationComplete: (result) => {
      const eCount = result.markers.filter((m) => m.severity === 8).length;
      const wCount = result.markers.filter((m) => m.severity === 4).length;
      onValidationChange?.(eCount, wCount);
    },
  });

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(
        currentTheme === "dark" ? "quriodb-dark" : "quriodb-light",
      );
    }
  }, [currentTheme]);

  useEffect(() => {
    if (mounted && enableValidation) validate(value);
  }, [value, mounted, enableValidation, validate]);

  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  // `mounted` is the readiness signal: Monaco mounts asynchronously, so a
  // reveal request that arrives earlier must apply once the editor exists.
  useRevealPositionRequest(revealRequest, editorRef, mounted);

  const handleErrorClick = useCallback((line: number, column: number) => {
    const editor = editorRef.current;
    if (editor) {
      editor.setPosition({ lineNumber: line, column });
      editor.focus();
      editor.revealLineInCenter(line);
    }
  }, []);

  const onRunRef = useRef(onRun);
  const onFormatRef = useRef(onFormat);
  const onStopRef = useRef(onStop);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onRunRef.current = onRun;
    onFormatRef.current = onFormat;
    onStopRef.current = onStop;
    onSaveRef.current = onSave;
  }, [onRun, onFormat, onStop, onSave]);

  // Selection ownership is resolved through refs so the debounced delivery
  // always reaches the latest consumer and always reports the content and
  // session the selection event actually fired on — not whatever closure
  // happened to be current at mount time.
  const valueRef = useRef(value);
  valueRef.current = value;
  const selectionSessionIdRef = useRef(selectionSessionId);
  selectionSessionIdRef.current = selectionSessionId;
  const onSelectionChangeRef = useRef(onSelectionChange);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Replacing the editor content (typing, loading a saved query, formatting,
  // a tab SQL update) invalidates any in-flight selection delivery: the old
  // range resolved over new text would repopulate a dead selection.
  useEffect(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }
  }, [value]);

  // When the editor unmounts (e.g. a SQL Lab tab switch) any pending
  // callback must also be dropped so it cannot deliver the old editor's
  // selection after this component is gone.
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
    };
  }, []);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      editor.onDidChangeCursorPosition((e) => {
        onPositionChange?.({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });

      editor.onDidChangeCursorSelection((e) => {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        // Ownership metadata is frozen at EVENT time: if the content or the
        // owning session changes before the debounce delivers, consumers can
        // detect the mismatch synchronously and treat it as no selection.
        const ownerSql = valueRef.current;
        const sessionId = selectionSessionIdRef.current;
        selectionTimeoutRef.current = setTimeout(() => {
          const selection = e.selection;
          const selectedText = editor.getModel()?.getValueInRange(selection);
          onSelectionChangeRef.current?.(selectedText || "", {
            ownerSql,
            sessionId: sessionId ?? "",
          });
        }, 200);
      });

      defineThemes(monaco);
      monaco.editor.setTheme(
        currentTheme === "dark" ? "quriodb-dark" : "quriodb-light",
      );

      registerEditorCommands({
        editor,
        monaco,
        // Keyboard run boundary: only a non-whitespace selection is an
        // explicit override. Empty/whitespace selections must arrive as
        // `undefined` so consumers keep their full-editor-content fallback
        // instead of treating `""` as a valid query. A nonempty selection is
        // accompanied by structured ownership intent frozen from the live
        // model at keypress time — never trusted as a raw string alone.
        onRun: () => {
          const selection = editor.getSelection();
          const selectedText = selection
            ? editor.getModel()?.getValueInRange(selection)
            : undefined;
          if (!selectedText?.trim()) {
            onRunRef.current?.(undefined);
            return;
          }
          // `ownerSql` comes from the live model (not the `value` prop):
          // between a content mutation and the next model commit the two
          // diverge, and only the model describes the text this selection
          // was actually carved from.
          onRunRef.current?.(selectedText, {
            text: selectedText,
            ownerSql: editor.getModel()?.getValue() ?? "",
            sessionId: selectionSessionIdRef.current ?? "",
          });
        },
        onFormat: () => onFormatRef.current?.(),
        onStop: () => onStopRef.current?.(),
        onSave: () => onSaveRef.current?.(),
      });

      setMounted(true);
    },
    [onPositionChange, currentTheme],
  );

  useEffect(() => {
    if (!mounted || !monacoRef.current || !editorRef.current) return;

    autocompleteDisposablesRef.current.forEach((disposable) =>
      disposable.dispose(),
    );
    const sqlDisposables =
      language === "sql"
        ? [
            registerSqlSuggestOnTyping(editorRef.current),
              registerSqlAutocomplete(
                monacoRef.current,
                tablesRef,
                columnsRef,
              databaseId,
                schemaId,
                sqlDialect,
                false,
                undefined,
                metadataRevisionRef,
              ),
          ]
        : [];

    autocompleteDisposablesRef.current = [
      ...sqlDisposables,
      registerMongoAutocomplete(monacoRef.current, tablesRef, columnsRef),
      registerRedisAutocomplete(monacoRef.current, tablesRef),
    ];

    return () => {
      autocompleteDisposablesRef.current.forEach((disposable) =>
        disposable.dispose(),
      );
      autocompleteDisposablesRef.current = [];
    };
  }, [mounted, databaseId, schemaId, sqlDialect, language]);

  return (
    <div className="sql-editor-container h-full flex flex-col overflow-hidden">
      <div className="editor-area flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          theme={currentTheme === "dark" ? "quriodb-dark" : "quriodb-light"}
          beforeMount={(monaco) => {
            defineThemes(monaco);
          }}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            inlineSuggest: {
              enabled: settings.editorInlineSuggestions ?? true,
              mode: "prefix",
            },
            minimap: { enabled: settings.editorMinimap },
            tabSize: settings.editorTabSize,
            fontSize: settings.editorFontSize,
            fontFamily: settings.editorFontFamily,
            fontWeight: "500",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: settings.editorWordWrap,
            padding: { top: 12, bottom: 12 },
            lineNumbers: settings.editorLineNumbers,
            renderLineHighlight: "all",
            fontLigatures: settings.editorLigatures,
            formatOnPaste: settings.editorFormatOnPaste,
            glyphMargin: enableValidation && language === "sql",
            renderValidationDecorations: "on",
            acceptSuggestionOnCommitCharacter: false,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            quickSuggestionsDelay: 100,
            // Keeps the empty "No suggestions." widget tall enough to enclose
            // its 24px message (default 0 yields a clipped 21px widget).
            suggestLineHeight: 24,
            wordBasedSuggestions: "off",
            suggest: {
              showWords: false,
            },
          }}
        />
      </div>

      {showErrorPanel && enableValidation && errors.length > 0 && (
        <ErrorPanel
          errors={errors}
          onErrorClick={handleErrorClick}
          maxHeight={120}
          title="SQL Problems"
        />
      )}
    </div>
  );
}
