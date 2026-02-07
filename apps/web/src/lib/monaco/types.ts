/**
 * @file types.ts
 * @description Type definitions for Monaco Editor validation system.
 * Contains all shared types used across validation services and components.
 */

/**
 * Represents a validation error/warning marker that will be displayed in the editor.
 * This structure maps directly to Monaco's IMarkerData interface.
 *
 * @example
 * {
 *   startLineNumber: 1,
 *   startColumn: 1,
 *   endLineNumber: 1,
 *   endColumn: 7,
 *   message: "Missing FROM clause after SELECT",
 *   severity: MarkerSeverity.Error
 * }
 */
export interface ValidationMarker {
  /** Starting line number (1-indexed) */
  startLineNumber: number;
  /** Starting column (1-indexed) */
  startColumn: number;
  /** Ending line number (1-indexed) */
  endLineNumber: number;
  /** Ending column (1-indexed) */
  endColumn: number;
  /** Error/warning message to display */
  message: string;
  /** Severity level of the marker */
  severity: MarkerSeverity;
  /** Optional source identifier (e.g., 'sql-validator', 'json-lint') */
  source?: string;
  /** Optional error code */
  code?: string;
}

/**
 * Mirrors Monaco's MarkerSeverity enum.
 * Used to classify the importance of validation issues.
 */
export enum MarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8,
}

/**
 * Validation result returned by validation services.
 */
export interface ValidationResult {
  /** Whether the code is valid (no errors) */
  isValid: boolean;
  /** Array of validation markers (errors/warnings) */
  markers: ValidationMarker[];
  /** Time taken for validation in milliseconds */
  validationTime?: number;
}

/**
 * Supported languages for validation.
 */
export type SupportedLanguage =
  | "sql"
  | "json"
  | "javascript"
  | "typescript"
  | "python";

/**
 * Language-specific validation options.
 */
export interface ValidationOptions {
  /** Enable strict mode validation */
  strict?: boolean;
  /** SQL dialect for SQL validation */
  sqlDialect?: "mysql" | "postgresql" | "sqlite" | "bigquery" | "mariadb";
  /** Custom validation rules */
  customRules?: ValidationRule[];
}

/**
 * Custom validation rule interface for extensibility.
 */
export interface ValidationRule {
  /** Unique rule identifier */
  id: string;
  /** Rule description */
  description: string;
  /** Severity of violations */
  severity: MarkerSeverity;
  /** Validation function */
  validate: (code: string) => ValidationMarker[];
}

/**
 * Error panel entry with additional display information.
 */
export interface ErrorPanelEntry {
  /** Unique ID for React key */
  id: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** End line number */
  endLine: number;
  /** End column number */
  endColumn: number;
  /** Error message */
  message: string;
  /** Severity level */
  severity: MarkerSeverity;
  /** Severity as string for display */
  severityLabel: "Error" | "Warning" | "Info" | "Hint";
}
