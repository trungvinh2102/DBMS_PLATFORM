/**
 * @file python-validator.ts
 * @description Basic Python syntax validator.
 */

import {
  MarkerSeverity,
  type ValidationMarker,
  type ValidationResult,
} from "../types";
import { validateBrackets } from "./validator-utils";

export function validatePython(code: string): ValidationResult {
  const startTime = performance.now();
  const markers: ValidationMarker[] = [];

  if (!code.trim()) {
    return {
      isValid: true,
      markers: [],
      validationTime: performance.now() - startTime,
    };
  }

  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const indentMatch = line.match(/^(\s+)/);
    if (
      indentMatch &&
      indentMatch[1].includes("\t") &&
      indentMatch[1].includes(" ")
    ) {
      markers.push({
        startLineNumber: i + 1,
        startColumn: 1,
        endLineNumber: i + 1,
        endColumn: indentMatch[1].length + 1,
        message: "Mixed tabs and spaces in indentation",
        severity: MarkerSeverity.Error,
        source: "python-validator",
      });
    }
  }

  markers.push(...validateBrackets(code, ["()", "[]", "{}"]));

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}
