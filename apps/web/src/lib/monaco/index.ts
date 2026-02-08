/**
 * @file index.ts
 * @description Barrel export file for Monaco Editor validation module.
 */

// Components
export { MonacoEditor } from "./MonacoEditor";
export { ErrorPanel } from "./ErrorPanel";

// Hooks
export { useEditorValidation } from "./useEditorValidation";

// Services
export { validateCode, markersToErrorEntries } from "./validationService";

// Types
export type {
  ValidationMarker,
  ValidationResult,
  ValidationOptions,
  ValidationRule,
  SupportedLanguage,
  ErrorPanelEntry,
} from "./types";

export { MarkerSeverity } from "./types";
