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
import { ErrorPanel } from "@/lib/monaco/ErrorPanel";
import type { ValidationOptions } from "@/lib/monaco/types";
import { useSettingsStore } from "@/stores/use-settings-store";
import { defineThemes } from "@/lib/monaco/themes";
import { registerSqlAutocomplete } from "@/lib/monaco/sql-autocomplete";
import { registerMongoAutocomplete } from "@/lib/monaco/mongodb-autocomplete";
import { registerRedisAutocomplete } from "@/lib/monaco/redis-autocomplete";
import { registerEditorCommands } from "../../app/sqllab/hooks/use-editor-commands";

interface SQLEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onPositionChange?: (position: { lineNumber: number; column: number }) => void;
  onSelectionChange?: (text: string) => void;
  onRun?: (sql?: string) => void;
  onFormat?: () => void;
  onStop?: () => void;
  onSave?: () => void;
  tabSize?: number;
  tables?: string[];
  columns?: Array<{ table: string; name: string; type: string }>;
  undoTrigger?: number;
  redoTrigger?: number;
  enableValidation?: boolean;
  showErrorPanel?: boolean;
  sqlDialect?: "mysql" | "postgresql" | "sqlite" | "mariadb" | "bigquery" | "clickhouse";
  language?: string;
  databaseId?: string;
  schemaId?: string;
  validationDebounceMs?: number;
  onValidationChange?: (errorCount: number, warningCount: number) => void;
  onErrorsChange?: (errors: any[]) => void;
}

export function SQLEditor({
  value,
  onChange,
  onPositionChange,
  onSelectionChange,
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
}: SQLEditorProps) {
  const { resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || "light";
  const settings = useSettingsStore();

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<Monaco | null>(null);
  const autocompleteDisposablesRef = useRef<monacoEditor.IDisposable[]>([]);
  const tablesRef = useRef<string[]>(tables);
  const columnsRef = useRef(columns);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    return () => {
      if (autocompleteDisposablesRef.current.length > 0) {
        autocompleteDisposablesRef.current.forEach((d) => d.dispose());
        autocompleteDisposablesRef.current = [];
      }
    };
  }, []);

  // Sync refs
  useEffect(() => {
    tablesRef.current = tables;
    columnsRef.current = columns;
  }, [tables, columns]);

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

  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        selectionTimeoutRef.current = setTimeout(() => {
          const selection = e.selection;
          const selectedText = editor.getModel()?.getValueInRange(selection);
          onSelectionChange?.(selectedText || "");
        }, 200);
      });

      defineThemes(monaco);
      monaco.editor.setTheme(
        currentTheme === "dark" ? "quriodb-dark" : "quriodb-light",
      );

      // Clean up previously registered autocomplete providers
      if (autocompleteDisposablesRef.current.length > 0) {
        autocompleteDisposablesRef.current.forEach((d) => d.dispose());
        autocompleteDisposablesRef.current = [];
      }

      autocompleteDisposablesRef.current.push(
        registerSqlAutocomplete(monaco, tablesRef, columnsRef, databaseId, schemaId),
        registerMongoAutocomplete(monaco, tablesRef, columnsRef),
        registerRedisAutocomplete(monaco, tablesRef)
      );

      registerEditorCommands({
        editor,
        monaco,
        onRun: () => {
          const selection = editor.getSelection();
          const selectedText = selection
            ? editor.getModel()?.getValueInRange(selection)
            : undefined;
          onRunRef.current?.(selectedText);
        },
        onFormat: () => onFormatRef.current?.(),
        onStop: () => onStopRef.current?.(),
        onSave: () => onSaveRef.current?.(),
      });

      setMounted(true);
    },
    [onPositionChange, onSelectionChange, currentTheme],
  );

  return (
    <div className="sql-editor-container h-full flex flex-col overflow-hidden">
      <div className="editor-area flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          theme={currentTheme === "dark" ? "vs-dark" : "vs"}
          beforeMount={(monaco) => {
            defineThemes(monaco);
          }}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            inlineSuggest: {
              enabled: settings.editorInlineSuggestions ?? true,
              mode: "prefix"
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
              strings: false
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
