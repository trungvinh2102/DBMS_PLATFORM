/**
 * @file MonacoEditor.tsx
 * @description Production-ready Monaco Editor component with real-time syntax validation.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";
import { useTheme } from "next-themes";

import { useEditorValidation } from "./useEditorValidation";
import { useSettingsStore } from "@/stores/use-settings-store";
import { ErrorPanel } from "./ErrorPanel";
import { defineThemes } from "./themes";
import type { SupportedLanguage, ValidationOptions } from "./types";

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: SupportedLanguage;
  height?: string | number;
  showErrorPanel?: boolean;
  showErrorBadge?: boolean;
  enableValidation?: boolean;
  debounceMs?: number;
  validationOptions?: ValidationOptions;
  onErrorClick?: (line: number, column: number) => void;
  onPositionChange?: (position: { lineNumber: number; column: number }) => void;
  onMount?: (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) => void;
  options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

export function MonacoEditor({
  value,
  onChange,
  language = "sql",
  height = "300px",
  showErrorPanel = true,
  showErrorBadge = true,
  enableValidation = true,
  debounceMs = 300,
  validationOptions,
  onErrorClick,
  onPositionChange,
  onMount,
  options,
  readOnly = false,
  className = "",
  placeholder,
}: MonacoEditorProps) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<Monaco | null>(null);
  const { resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || "light";
  const editorTheme =
    currentTheme === "dark" ? "querypie-dark" : "querypie-light";
  const settings = useSettingsStore();

  const {
    errors,
    isValid,
    errorCount,
    warningCount,
    isValidating,
    lastValidationTime,
    validate,
    clearMarkers,
  } = useEditorValidation({
    monacoRef,
    editorRef,
    language,
    debounceMs,
    validationOptions,
    enabled: enableValidation,
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted && enableValidation) validate(value);
  }, [value, mounted, enableValidation, validate]);

  useEffect(() => {
    if (mounted && enableValidation) {
      clearMarkers();
      validate(value);
    }
  }, [language, mounted, enableValidation, clearMarkers, validate, value]);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      defineThemes(monaco);
      monaco.editor.setTheme(editorTheme);
      editor.onDidChangeCursorPosition((e) => {
        onPositionChange?.({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });
      setMounted(true);
      onMount?.(editor, monaco);
    },
    [currentTheme, onPositionChange, onMount],
  );

  const handleErrorClickInternal = useCallback(
    (line: number, column: number) => {
      const editor = editorRef.current;
      if (editor) {
        editor.setPosition({ lineNumber: line, column });
        editor.focus();
        editor.revealLineInCenter(line);
      }
      onErrorClick?.(line, column);
    },
    [onErrorClick],
  );

  const editorHeight = showErrorPanel
    ? `calc(${typeof height === "number" ? `${height}px` : height} - 150px)`
    : height;

  return (
    <div
      className={`monaco-editor-container flex flex-col border border-border rounded-lg overflow-hidden bg-background ${className}`}
    >
      {showErrorBadge && enableValidation && (
        <ValidationStatusBar
          isValidating={isValidating}
          isValid={isValid}
          errorCount={errorCount}
          warningCount={warningCount}
          value={value}
          time={lastValidationTime}
        />
      )}

      <div
        className="editor-wrapper relative flex-1 min-h-37.5"
        style={{ height: editorHeight }}
      >
        <Editor
          height="100%"
          language={language}
          theme={editorTheme}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: settings.editorMinimap },
            fontSize: settings.editorFontSize,
            fontFamily: settings.editorFontFamily,
            fontWeight: "500",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: settings.editorWordWrap,
            padding: { top: 12, bottom: 12 },
            lineNumbers: settings.editorLineNumbers,
            tabSize: settings.editorTabSize,
            readOnly,
            glyphMargin: enableValidation,
            renderValidationDecorations: "on",
            formatOnPaste: settings.editorFormatOnPaste,
            ...options,
          }}
        />
        {placeholder && !value && (
          <div className="absolute top-3 left-15 text-muted-foreground/40 pointer-events-none font-mono text-sm leading-relaxed">
            {placeholder}
          </div>
        )}
      </div>

      {showErrorPanel && enableValidation && (
        <ErrorPanel
          errors={errors}
          onErrorClick={handleErrorClickInternal}
          maxHeight={140}
        />
      )}
    </div>
  );
}

function ValidationStatusBar({
  isValidating,
  isValid,
  errorCount,
  warningCount,
  value,
  time,
}: any) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] bg-muted/30 border-b border-border">
      {isValidating ? (
        <span className="text-muted-foreground italic">Validating...</span>
      ) : (
        <>
          {errorCount > 0 && (
            <span className="bg-red-900/50 text-red-200 px-2 py-0.5 rounded font-medium">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-amber-900/50 text-amber-200 px-2 py-0.5 rounded font-medium">
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </span>
          )}
          {isValid &&
            errorCount === 0 &&
            warningCount === 0 &&
            value.trim() && (
              <span className="bg-emerald-900/50 text-emerald-200 px-2 py-0.5 rounded font-medium">
                ✓ Valid
              </span>
            )}
        </>
      )}
      {time !== null && (
        <span className="text-muted-foreground/60 ml-auto">
          {time.toFixed(0)}ms
        </span>
      )}
    </div>
  );
}

export default MonacoEditor;
