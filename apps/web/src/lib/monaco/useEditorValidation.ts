/**
 * @file useEditorValidation.ts
 * @description Custom hook for managing Monaco Editor validation.
 * Provides debounced validation, marker management, and error state.
 *
 * ## Features:
 * - Debounced validation (300-500ms) to avoid blocking UI
 * - Monaco marker integration via setModelMarkers
 * - Error state management
 * - Support for multiple languages
 * - Performance optimized
 *
 * ## Usage:
 * ```tsx
 * const { errors, isValidating, validate } = useEditorValidation({
 *   monacoRef,
 *   editorRef,
 *   language: 'sql',
 *   debounceMs: 300,
 * });
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";

import { validateCode, markersToErrorEntries } from "./validationService";
import type {
  ErrorPanelEntry,
  SupportedLanguage,
  ValidationMarker,
  ValidationOptions,
  ValidationResult,
} from "./types";
import { MarkerSeverity } from "./types";

// ============================================================================
// TYPES
// ============================================================================

interface UseEditorValidationProps {
  /** Reference to Monaco instance */
  monacoRef: React.RefObject<Monaco | null>;
  /** Reference to editor instance */
  editorRef: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;
  /** Language to validate */
  language: SupportedLanguage;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Optional validation options */
  validationOptions?: ValidationOptions;
  /** Callback when validation completes */
  onValidationComplete?: (result: ValidationResult) => void;
  /** Enable/disable validation (default: true) */
  enabled?: boolean;
  /** Owner ID for markers (used to identify/clear markers) */
  markerId?: string;
}

interface UseEditorValidationReturn {
  /** Array of error entries for display */
  errors: ErrorPanelEntry[];
  /** Current validation markers */
  markers: ValidationMarker[];
  /** Whether validation is currently running */
  isValidating: boolean;
  /** Whether the code is valid (no errors) */
  isValid: boolean;
  /** Count of errors */
  errorCount: number;
  /** Count of warnings */
  warningCount: number;
  /** Last validation time in ms */
  lastValidationTime: number | null;
  /** Manually trigger validation */
  validate: (code: string) => void;
  /** Clear all markers and errors */
  clearMarkers: () => void;
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for Monaco Editor validation.
 * Handles debounced syntax validation with visual markers.
 */
export function useEditorValidation({
  monacoRef,
  editorRef,
  language,
  debounceMs = 300,
  validationOptions,
  onValidationComplete,
  enabled = true,
  markerId = "syntax-validator",
}: UseEditorValidationProps): UseEditorValidationReturn {
  // ============================================================================
  // STATE
  // ============================================================================

  const [markers, setMarkers] = useState<ValidationMarker[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationTime, setLastValidationTime] = useState<number | null>(
    null,
  );

  // Track last validated code to avoid redundant validations
  const lastValidatedCode = useRef<string>("");

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const errors = useMemo(() => markersToErrorEntries(markers), [markers]);

  const errorCount = useMemo(
    () => markers.filter((m) => m.severity === MarkerSeverity.Error).length,
    [markers],
  );

  const warningCount = useMemo(
    () => markers.filter((m) => m.severity === MarkerSeverity.Warning).length,
    [markers],
  );

  const isValid = errorCount === 0;

  // ============================================================================
  // STABLE REFS FOR CALLBACKS
  // ============================================================================

  const onValidationCompleteRef = useRef(onValidationComplete);
  const validationOptionsRef = useRef(validationOptions);

  useEffect(() => {
    onValidationCompleteRef.current = onValidationComplete;
  }, [onValidationComplete]);

  useEffect(() => {
    validationOptionsRef.current = validationOptions;
  }, [validationOptions]);

  // ============================================================================
  // CORE VALIDATION FUNCTION
  // ============================================================================

  const performValidation = useCallback(
    (code: string) => {
      if (!enabled) return;

      // Skip if code hasn't changed
      if (code === lastValidatedCode.current) {
        return;
      }

      lastValidatedCode.current = code;
      setIsValidating(true);

      try {
        // Run validation using current options from ref
        const result = validateCode(
          code,
          language,
          validationOptionsRef.current,
        );

        // Update markers state
        setMarkers(result.markers);
        setLastValidationTime(result.validationTime || 0);

        // Apply markers to Monaco editor
        const monaco = monacoRef.current;
        const editor = editorRef.current;

        if (monaco && editor) {
          const model = editor.getModel();
          if (model) {
            // Convert our markers to Monaco's IMarkerData format
            const monacoMarkers = result.markers.map((marker) => ({
              startLineNumber: marker.startLineNumber,
              startColumn: marker.startColumn,
              endLineNumber: marker.endLineNumber,
              endColumn: marker.endColumn,
              message: marker.message,
              severity: mapSeverityToMonaco(monaco, marker.severity),
              source: marker.source,
              code: marker.code,
            }));

            // Apply markers to the model
            monaco.editor.setModelMarkers(model, markerId, monacoMarkers);
          }
        }

        // Notify caller using ref to avoid stale closure
        onValidationCompleteRef.current?.(result);
      } catch (error) {
        console.error("Validation error:", error);
      } finally {
        setIsValidating(false);
      }
    },
    [enabled, language, monacoRef, editorRef, markerId],
  );

  // ============================================================================
  // DEBOUNCED VALIDATION
  // ============================================================================

  const debouncedValidate = useMemo(
    () => debounce(performValidation, debounceMs),
    [performValidation, debounceMs],
  );

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Manually trigger validation.
   * Useful for immediate validation (e.g., on format or paste).
   */
  const validate = useCallback(
    (code: string) => {
      debouncedValidate(code);
    },
    [debouncedValidate],
  );

  /**
   * Clear all markers and reset validation state.
   */
  const clearMarkers = useCallback(() => {
    setMarkers([]);
    lastValidatedCode.current = "";

    const monaco = monacoRef.current;
    const editor = editorRef.current;

    if (monaco && editor) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, markerId, []);
      }
    }
  }, [monacoRef, editorRef, markerId]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clear markers on unmount
      clearMarkers();
    };
  }, [clearMarkers]);

  // ============================================================================
  // LANGUAGE CHANGE HANDLER
  // ============================================================================

  useEffect(() => {
    // Clear markers and revalidate when language changes
    clearMarkers();
    lastValidatedCode.current = "";
  }, [language, clearMarkers]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    errors,
    markers,
    isValidating,
    isValid,
    errorCount,
    warningCount,
    lastValidationTime,
    validate,
    clearMarkers,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Map our MarkerSeverity to Monaco's MarkerSeverity.
 */
function mapSeverityToMonaco(
  monaco: Monaco,
  severity: MarkerSeverity,
): monacoEditor.MarkerSeverity {
  switch (severity) {
    case MarkerSeverity.Error:
      return monaco.MarkerSeverity.Error;
    case MarkerSeverity.Warning:
      return monaco.MarkerSeverity.Warning;
    case MarkerSeverity.Info:
      return monaco.MarkerSeverity.Info;
    case MarkerSeverity.Hint:
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Error;
  }
}

// ============================================================================
// EXPORT HOOK FOR CONVENIENCE
// ============================================================================

export default useEditorValidation;
