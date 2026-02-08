/**
 * @file validationService.ts
 * @description Centralized validation service for multiple languages.
 */

import {
  type SupportedLanguage,
  type ValidationMarker,
  type ValidationOptions,
  type ValidationResult,
  type ErrorPanelEntry,
} from "./types";
import { validateSQL } from "./validators/sql-validator";
import { validateJSON } from "./validators/json-validator";
import { validateJavaScript } from "./validators/js-validator";
import { validatePython } from "./validators/python-validator";
import { getSeverityLabel } from "./validators/validator-utils";

/**
 * Main validation entry point.
 */
export function validateCode(
  code: string,
  language: SupportedLanguage,
  options?: ValidationOptions,
): ValidationResult {
  switch (language) {
    case "sql":
      return validateSQL(code, options?.sqlDialect);
    case "json":
      return validateJSON(code);
    case "javascript":
    case "typescript":
      return validateJavaScript(code);
    case "python":
      return validatePython(code);
    default:
      return {
        isValid: true,
        markers: [],
        validationTime: 0,
      };
  }
}

/**
 * Convert ValidationMarker array to ErrorPanelEntry array.
 */
export function markersToErrorEntries(
  markers: ValidationMarker[],
): ErrorPanelEntry[] {
  return markers.map((marker, index) => ({
    id: `error-${index}-${marker.startLineNumber}-${marker.startColumn}`,
    line: marker.startLineNumber,
    column: marker.startColumn,
    endLine: marker.endLineNumber,
    endColumn: marker.endColumn,
    message: marker.message,
    severity: marker.severity,
    severityLabel: getSeverityLabel(marker.severity),
  }));
}
