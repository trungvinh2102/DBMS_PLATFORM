/**
 * @file MonacoEditor.tsx
 * @description Production-ready Monaco Editor component with real-time syntax validation.
 *
 * ## Features:
 * - Configurable language (SQL, JSON, JavaScript, TypeScript, Python)
 * - Real-time syntax validation with visual markers
 * - Error panel displaying all issues
 * - Dark/light theme support
 * - Auto layout
 * - Controlled value via state
 * - Performance optimized with debounced validation
 *
 * ## Architecture:
 * - Uses useEditorValidation hook for validation logic
 * - Integrates with validationService.ts for multi-language support
 * - Clean separation of concerns
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
import type { SupportedLanguage, ValidationOptions } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface MonacoEditorProps {
  /** Current value of the editor */
  value: string;
  /** Callback when value changes */
  onChange: (value: string | undefined) => void;
  /** Language for syntax highlighting and validation */
  language?: SupportedLanguage;
  /** Editor height (CSS value) */
  height?: string | number;
  /** Show/hide error panel below editor */
  showErrorPanel?: boolean;
  /** Show/hide error count badge */
  showErrorBadge?: boolean;
  /** Enable/disable validation */
  enableValidation?: boolean;
  /** Validation debounce delay in ms */
  debounceMs?: number;
  /** Validation options (e.g., SQL dialect) */
  validationOptions?: ValidationOptions;
  /** Called when user clicks on an error in the panel */
  onErrorClick?: (line: number, column: number) => void;
  /** Called on cursor position change */
  onPositionChange?: (position: { lineNumber: number; column: number }) => void;
  /** Callback when editor mounts */
  onMount?: (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) => void;
  /** Additional Monaco editor options */
  options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;
  /** Read-only mode */
  readOnly?: boolean;
  /** CSS class for container */
  className?: string;
  /** Custom placeholder text */
  placeholder?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

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
  // ============================================================================
  // REFS
  // ============================================================================

  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<Monaco | null>(null);

  // ============================================================================
  // THEME
  // ============================================================================

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const editorTheme =
    currentTheme === "dark" ? "validation-dark" : "validation-light";

  // ============================================================================
  // SETTINGS
  // ============================================================================
  const {
    editorFontSize,
    editorFontFamily,
    editorTabSize,
    editorMinimap,
    editorWordWrap,
    editorLineNumbers,
    editorFormatOnPaste,
  } = useSettingsStore();

  // ============================================================================
  // VALIDATION HOOK
  // ============================================================================

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

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [mounted, setMounted] = useState(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Validate on value change
  useEffect(() => {
    if (mounted && enableValidation) {
      validate(value);
    }
  }, [value, mounted, enableValidation, validate]);

  // Re-validate when language changes
  useEffect(() => {
    if (mounted && enableValidation) {
      clearMarkers();
      validate(value);
    }
  }, [language]);

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(editorTheme);
    }
  }, [editorTheme]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle editor mount event.
   * Sets up refs, custom themes, and initial validation.
   */
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Define custom themes with error highlighting colors
      defineValidationThemes(monaco);

      // Set initial theme
      monaco.editor.setTheme(editorTheme);

      // Setup cursor position tracking
      editor.onDidChangeCursorPosition((e) => {
        onPositionChange?.({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // Mark as mounted
      setMounted(true);

      // Call user's onMount callback
      onMount?.(editor, monaco);
    },
    [editorTheme, onPositionChange, onMount],
  );

  /**
   * Handle error click from error panel.
   * Navigates editor to the error location.
   */
  const handleErrorClick = useCallback(
    (line: number, column: number) => {
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

      onErrorClick?.(line, column);
    },
    [onErrorClick],
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const editorHeight = showErrorPanel
    ? `calc(${typeof height === "number" ? `${height}px` : height} - 150px)`
    : height;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={`monaco-editor-container ${className}`}>
      {/* Error Badge */}
      {showErrorBadge && enableValidation && (
        <div className="validation-status">
          {isValidating ? (
            <span className="validating-badge">Validating...</span>
          ) : (
            <>
              {errorCount > 0 && (
                <span className="error-badge">
                  {errorCount} error{errorCount !== 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="warning-badge">
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </span>
              )}
              {isValid &&
                errorCount === 0 &&
                warningCount === 0 &&
                value.trim() && <span className="valid-badge">✓ Valid</span>}
            </>
          )}
          {lastValidationTime !== null && (
            <span className="validation-time">
              {lastValidationTime.toFixed(0)}ms
            </span>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="editor-wrapper" style={{ height: editorHeight }}>
        <Editor
          height="100%"
          language={language}
          theme={editorTheme}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: editorMinimap },
            fontSize: editorFontSize,
            fontFamily: editorFontFamily,
            fontWeight: "500",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: editorWordWrap,
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            lineNumbers: editorLineNumbers,
            renderLineHighlight: "all",
            lineHeight: 20,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            tabSize: editorTabSize,
            readOnly,
            // Glyph margin for error icons
            glyphMargin: enableValidation,
            // Folding
            folding: true,
            foldingStrategy: "auto",
            // Show error squiggles
            renderValidationDecorations: "on",
            formatOnPaste: editorFormatOnPaste,
            ...options,
          }}
        />

        {/* Placeholder */}
        {placeholder && !value && (
          <div className="editor-placeholder">{placeholder}</div>
        )}
      </div>

      {/* Error Panel */}
      {showErrorPanel && enableValidation && (
        <ErrorPanel
          errors={errors}
          onErrorClick={handleErrorClick}
          maxHeight={140}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        .monaco-editor-container {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border, #333);
          border-radius: 8px;
          overflow: hidden;
          background: var(--background, #050505);
        }

        .validation-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          font-size: 11px;
          background: var(--muted, #111);
          border-bottom: 1px solid var(--border, #333);
        }

        .error-badge {
          background: #7f1d1d;
          color: #fecaca;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .warning-badge {
          background: #78350f;
          color: #fde68a;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .valid-badge {
          background: #14532d;
          color: #86efac;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .validating-badge {
          color: #9ca3af;
          font-style: italic;
        }

        .validation-time {
          color: #6b7280;
          margin-left: auto;
        }

        .editor-wrapper {
          position: relative;
          flex: 1;
          min-height: 150px;
        }

        .editor-placeholder {
          position: absolute;
          top: 12px;
          left: 60px;
          color: #555;
          pointer-events: none;
          font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
          font-size: 13px;
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

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

/**
 * Define custom Monaco themes with error highlighting support.
 */
function defineValidationThemes(monaco: Monaco) {
  // Dark theme with error highlighting
  monaco.editor.defineTheme("validation-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
      { token: "string", foreground: "CE9178" },
      { token: "number", foreground: "B5CEA8" },
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "identifier", foreground: "DCDCAA" },
      { token: "type", foreground: "4EC9B0" },
      { token: "operator", foreground: "D4D4D4" },
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
      // Error highlighting colors
      "editorError.foreground": "#F14C4C",
      "editorError.border": "#F14C4C",
      "editorWarning.foreground": "#CCA700",
      "editorWarning.border": "#CCA700",
      "editorInfo.foreground": "#3794FF",
      "editorInfo.border": "#3794FF",
      // Glyph margin
      "editorGutter.background": "#050505",
      // Overview ruler
      "editorOverviewRuler.errorForeground": "#F14C4C",
      "editorOverviewRuler.warningForeground": "#CCA700",
    },
  });

  // Light theme with error highlighting
  monaco.editor.defineTheme("validation-light", {
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
      "editorInfo.foreground": "#1a85ff",
      "editorInfo.border": "#1a85ff",
      // Glyph margin
      "editorGutter.background": "#FFFFFF",
      // Overview ruler
      "editorOverviewRuler.errorForeground": "#E51400",
      "editorOverviewRuler.warningForeground": "#BF8803",
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MonacoEditor;
