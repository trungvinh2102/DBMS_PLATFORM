/**
 * @file js-validator.ts
 * @description JavaScript/TypeScript syntax validator.
 */

import {
  MarkerSeverity,
  type ValidationMarker,
  type ValidationResult,
} from "../types";
import { validateBrackets } from "./validator-utils";

export function validateJavaScript(code: string): ValidationResult {
  const startTime = performance.now();
  const markers: ValidationMarker[] = [];

  if (!code.trim()) {
    return {
      isValid: true,
      markers: [],
      validationTime: performance.now() - startTime,
    };
  }

  try {
    new Function(code);
    markers.push(...validateBrackets(code, ["{}", "[]", "()"]));
  } catch (error) {
    markers.push(extractJSErrorMarker(error, code));
  }

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

function extractJSErrorMarker(error: unknown, code: string): ValidationMarker {
  const message = error instanceof Error ? error.message : "JS syntax error";
  const lines = code.split("\n");
  const stackMatch = message.match(/<anonymous>:(\d+):(\d+)/);
  const tokenMatch = message.match(/\((\d+):(\d+)\)/);

  let startLineNumber = 1,
    startColumn = 1;
  if (stackMatch || tokenMatch) {
    const match = stackMatch || tokenMatch;
    startLineNumber = parseInt(match![1], 10);
    startColumn = parseInt(match![2], 10);
  }

  return {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn: startColumn + 1,
    message,
    severity: MarkerSeverity.Error,
    source: "js-validator",
  };
}
