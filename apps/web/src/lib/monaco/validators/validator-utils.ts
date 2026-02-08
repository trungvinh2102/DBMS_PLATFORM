/**
 * @file validator-utils.ts
 * @description Shared utility functions for code validation.
 */

import { MarkerSeverity, type ValidationMarker } from "../types";

export function validateBrackets(
  code: string,
  bracketPairs: string[],
): ValidationMarker[] {
  const markers: ValidationMarker[] = [];
  const lines = code.split("\n");

  for (const pair of bracketPairs) {
    const [open, close] = pair;
    const stack: Array<{ line: number; column: number }> = [];
    let inString = false;
    let stringChar = "";
    let inComment = false;
    let inMultiComment = false;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      for (let colIndex = 0; colIndex < line.length; colIndex++) {
        const char = line[colIndex];
        const prevChar = colIndex > 0 ? line[colIndex - 1] : "";
        const nextChar = colIndex < line.length - 1 ? line[colIndex + 1] : "";

        if (!inString) {
          if (char === "/" && nextChar === "/") inComment = true;
          if (char === "/" && nextChar === "*") inMultiComment = true;
          if (inMultiComment && char === "*" && nextChar === "/") {
            inMultiComment = false;
            colIndex++;
            continue;
          }
        }

        if (inComment || inMultiComment) continue;

        if (
          (char === '"' || char === "'" || char === "`") &&
          prevChar !== "\\"
        ) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
        }

        if (inString) continue;

        if (char === open) {
          stack.push({ line: lineIndex + 1, column: colIndex + 1 });
        } else if (char === close) {
          if (stack.length === 0) {
            markers.push({
              startLineNumber: lineIndex + 1,
              startColumn: colIndex + 1,
              endLineNumber: lineIndex + 1,
              endColumn: colIndex + 2,
              message: `Unmatched closing bracket '${close}'`,
              severity: MarkerSeverity.Error,
              source: "bracket-validator",
            });
          } else {
            stack.pop();
          }
        }
      }
      inComment = false;
    }

    for (const unclosed of stack) {
      markers.push({
        startLineNumber: unclosed.line,
        startColumn: unclosed.column,
        endLineNumber: unclosed.line,
        endColumn: unclosed.column + 1,
        message: `Unclosed bracket '${open}'`,
        severity: MarkerSeverity.Error,
        source: "bracket-validator",
      });
    }
  }

  return markers;
}

export function getSeverityLabel(
  severity: MarkerSeverity,
): "Error" | "Warning" | "Info" | "Hint" {
  switch (severity) {
    case MarkerSeverity.Error:
      return "Error";
    case MarkerSeverity.Warning:
      return "Warning";
    case MarkerSeverity.Info:
      return "Info";
    case MarkerSeverity.Hint:
      return "Hint";
    default:
      return "Error";
  }
}
