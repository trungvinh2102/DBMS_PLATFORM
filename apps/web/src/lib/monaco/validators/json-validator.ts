/**
 * @file json-validator.ts
 * @description JSON syntax validator.
 */

import {
  MarkerSeverity,
  type ValidationMarker,
  type ValidationResult,
} from "../types";

export function validateJSON(code: string): ValidationResult {
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
    JSON.parse(code);
  } catch (error) {
    markers.push(extractJSONErrorMarker(error, code));
  }

  return {
    isValid: markers.length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

function extractJSONErrorMarker(
  error: unknown,
  code: string,
): ValidationMarker {
  const message = error instanceof Error ? error.message : "Invalid JSON";
  const lines = code.split("\n");
  const positionMatch = message.match(/position (\d+)/);
  const lineColMatch = message.match(/line (\d+) column (\d+)/);

  let startLineNumber = 1,
    startColumn = 1;

  if (lineColMatch) {
    startLineNumber = parseInt(lineColMatch[1], 10);
    startColumn = parseInt(lineColMatch[2], 10);
  } else if (positionMatch) {
    const pos = parseInt(positionMatch[1], 10);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (count + lines[i].length + 1 > pos) {
        startLineNumber = i + 1;
        startColumn = pos - count + 1;
        break;
      }
      count += lines[i].length + 1;
    }
  }

  return {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn: startColumn + 1,
    message,
    severity: MarkerSeverity.Error,
    source: "json-validator",
  };
}
