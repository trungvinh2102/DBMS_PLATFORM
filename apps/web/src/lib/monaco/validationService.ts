/**
 * @file validationService.ts
 * @description Centralized validation service for multiple languages.
 * Provides syntax validation for SQL, JSON, JavaScript/TypeScript.
 *
 * ## Architecture:
 * - Each language has its own validator function
 * - Validators return standardized ValidationResult
 * - Main validateCode function routes to appropriate validator
 *
 * ## Validation Flow:
 * 1. Receive code and language
 * 2. Route to language-specific validator
 * 3. Parse/analyze code
 * 4. Generate ValidationMarkers for any issues
 * 5. Return ValidationResult
 */

import { Parser } from "node-sql-parser";
import {
  MarkerSeverity,
  type SupportedLanguage,
  type ValidationMarker,
  type ValidationOptions,
  type ValidationResult,
} from "./types";

// ============================================================================
// SQL VALIDATION
// ============================================================================

/**
 * SQL Parser instance - reused for performance.
 * Supports multiple SQL dialects via node-sql-parser.
 */
const sqlParser = new Parser();

/**
 * SQL dialect mapping for node-sql-parser.
 */
const SQL_DIALECT_MAP: Record<string, string> = {
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
  mariadb: "MariaDB",
  bigquery: "BigQuery",
};

/**
 * Validate SQL syntax using node-sql-parser.
 * Detects: syntax errors, missing clauses, invalid tokens.
 *
 * @param code - SQL code to validate
 * @param dialect - SQL dialect (mysql, postgresql, sqlite, etc.)
 * @returns ValidationResult with markers for any errors
 */
export function validateSQL(
  code: string,
  dialect: string = "postgresql",
): ValidationResult {
  const startTime = performance.now();
  const markers: ValidationMarker[] = [];

  // Skip empty or whitespace-only code
  if (!code.trim()) {
    return {
      isValid: true,
      markers: [],
      validationTime: performance.now() - startTime,
    };
  }

  try {
    // Attempt to parse the SQL
    const parserDialect = SQL_DIALECT_MAP[dialect] || "PostgreSQL";
    sqlParser.astify(code, { database: parserDialect });

    // If parsing succeeds, run additional custom validations
    const customMarkers = runCustomSQLValidations(code);
    markers.push(...customMarkers);
  } catch (error) {
    // Parse error - extract location and message
    const marker = extractSQLErrorMarker(error, code);
    markers.push(marker);
  }

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

/**
 * Extract error marker from SQL parse error.
 * Parses error message to locate line/column information.
 */
function extractSQLErrorMarker(error: unknown, code: string): ValidationMarker {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown SQL syntax error";
  const lines = code.split("\n");

  // Try to extract location from error message
  // Common format: "You have an error in your SQL syntax... near 'xxx' at line X"
  const lineMatch = message.match(/at line (\d+)/i);
  const nearMatch = message.match(/near ['"]([^'"]+)['"]/i);
  const locationMatch = message.match(/line (\d+), column (\d+)/i);

  let startLineNumber = 1;
  let startColumn = 1;
  let endLineNumber = 1;
  let endColumn = lines[0]?.length || 1;

  if (locationMatch) {
    startLineNumber = parseInt(locationMatch[1], 10);
    startColumn = parseInt(locationMatch[2], 10);
    endLineNumber = startLineNumber;
    endColumn = startColumn + 5;
  } else if (lineMatch) {
    startLineNumber = parseInt(lineMatch[1], 10);
    endLineNumber = startLineNumber;
    const lineContent = lines[startLineNumber - 1] || "";
    endColumn = lineContent.length + 1;
  }

  if (nearMatch) {
    // Find the problematic token in the code
    const problemToken = nearMatch[1];
    for (let i = 0; i < lines.length; i++) {
      const tokenIndex = lines[i].indexOf(problemToken);
      if (tokenIndex !== -1) {
        startLineNumber = i + 1;
        startColumn = tokenIndex + 1;
        endLineNumber = i + 1;
        endColumn = tokenIndex + problemToken.length + 1;
        break;
      }
    }
  }

  // Clean up error message for display
  const cleanMessage =
    message
      .replace(/\s*at line \d+/gi, "")
      .replace(/You have an error in your SQL syntax;?/gi, "")
      .replace(/check the manual.*for the right syntax/gi, "")
      .trim() || "SQL syntax error";

  return {
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    message: cleanMessage,
    severity: MarkerSeverity.Error,
    source: "sql-validator",
  };
}

/**
 * Run custom SQL validations beyond basic syntax parsing.
 * Detects common SQL mistakes and anti-patterns.
 */
function runCustomSQLValidations(code: string): ValidationMarker[] {
  const markers: ValidationMarker[] = [];
  const lines = code.split("\n");
  const upperCode = code.toUpperCase();

  // Check for SELECT without FROM (except SELECT with literals only)
  if (upperCode.includes("SELECT") && !upperCode.includes("FROM")) {
    const selectMatch = /\bSELECT\b/i.exec(code);
    // Only warn if it's not a simple value select like "SELECT 1" or "SELECT 'hello'"
    if (selectMatch && !/SELECT\s+[\d'"]/i.test(code)) {
      const lineIndex =
        code.substring(0, selectMatch.index).split("\n").length - 1;
      const lineContent = lines[lineIndex];
      const column =
        selectMatch.index - code.lastIndexOf("\n", selectMatch.index);

      markers.push({
        startLineNumber: lineIndex + 1,
        startColumn: column,
        endLineNumber: lineIndex + 1,
        endColumn: column + 6,
        message: "SELECT statement may be missing FROM clause",
        severity: MarkerSeverity.Warning,
        source: "sql-rules",
      });
    }
  }

  // Check for JOIN without ON
  const joinRegex = /\b(LEFT|RIGHT|INNER|OUTER|CROSS)?\s*JOIN\b/gi;
  let match;
  while ((match = joinRegex.exec(code)) !== null) {
    // Look ahead for ON clause within reasonable distance
    const afterJoin = code.substring(match.index, match.index + 100);
    if (
      !/\bON\b/i.test(afterJoin) &&
      !/\bCROSS\s+JOIN\b/i.test(afterJoin.substring(0, 20))
    ) {
      const lineIndex = code.substring(0, match.index).split("\n").length - 1;
      const column = match.index - code.lastIndexOf("\n", match.index);

      markers.push({
        startLineNumber: lineIndex + 1,
        startColumn: column,
        endLineNumber: lineIndex + 1,
        endColumn: column + match[0].length,
        message: "JOIN clause may be missing ON condition",
        severity: MarkerSeverity.Warning,
        source: "sql-rules",
      });
    }
  }

  // Check for trailing comma before FROM/WHERE/GROUP/ORDER
  const trailingCommaRegex =
    /,\s*\n?\s*(FROM|WHERE|GROUP|ORDER|HAVING|LIMIT)\b/gi;
  while ((match = trailingCommaRegex.exec(code)) !== null) {
    const lineIndex = code.substring(0, match.index).split("\n").length - 1;
    const column = match.index - code.lastIndexOf("\n", match.index);

    markers.push({
      startLineNumber: lineIndex + 1,
      startColumn: column,
      endLineNumber: lineIndex + 1,
      endColumn: column + 1,
      message: `Trailing comma before ${match[1]}`,
      severity: MarkerSeverity.Error,
      source: "sql-rules",
      code: "SQL001",
    });
  }

  // Check for unclosed parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    markers.push({
      startLineNumber: lines.length,
      startColumn: 1,
      endLineNumber: lines.length,
      endColumn: (lines[lines.length - 1]?.length || 0) + 1,
      message:
        openParens > closeParens
          ? `Missing ${openParens - closeParens} closing parenthesis`
          : `Extra ${closeParens - openParens} closing parenthesis`,
      severity: MarkerSeverity.Error,
      source: "sql-rules",
    });
  }

  return markers;
}

// ============================================================================
// JSON VALIDATION
// ============================================================================

/**
 * Validate JSON syntax.
 * Uses native JSON.parse with enhanced error location extraction.
 *
 * @param code - JSON code to validate
 * @returns ValidationResult with markers for any errors
 */
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
    const marker = extractJSONErrorMarker(error, code);
    markers.push(marker);
  }

  return {
    isValid: markers.length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

/**
 * Extract error marker from JSON parse error.
 * Handles different browser error message formats.
 */
function extractJSONErrorMarker(
  error: unknown,
  code: string,
): ValidationMarker {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Invalid JSON";
  const lines = code.split("\n");

  // Common error format: "Unexpected token X in JSON at position Y"
  // Or: "JSON.parse: unexpected character at line X column Y"
  const positionMatch = message.match(/position (\d+)/);
  const lineColMatch = message.match(/line (\d+) column (\d+)/);

  let startLineNumber = 1;
  let startColumn = 1;
  let endLineNumber = 1;
  let endColumn = 2;

  if (lineColMatch) {
    startLineNumber = parseInt(lineColMatch[1], 10);
    startColumn = parseInt(lineColMatch[2], 10);
    endLineNumber = startLineNumber;
    endColumn = startColumn + 1;
  } else if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    // Convert position to line/column
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (charCount + lineLength > position) {
        startLineNumber = i + 1;
        startColumn = position - charCount + 1;
        endLineNumber = startLineNumber;
        endColumn = startColumn + 1;
        break;
      }
      charCount += lineLength;
    }
  }

  // Check for common JSON issues
  let enhancedMessage = message;

  // Trailing comma detection
  const trailingCommaMatch = code.match(/,(\s*[\]}])/);
  if (trailingCommaMatch) {
    enhancedMessage = "Trailing comma is not allowed in JSON";
    // Find position of trailing comma
    const commaIndex = code.indexOf(trailingCommaMatch[0]);
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= commaIndex) {
        startLineNumber = i + 1;
        startColumn = commaIndex - charCount + 1;
        endLineNumber = startLineNumber;
        endColumn = startColumn + 1;
        break;
      }
      charCount += lines[i].length + 1;
    }
  }

  // Single quote detection
  if (code.includes("'") && message.includes("Unexpected")) {
    enhancedMessage = "JSON requires double quotes, not single quotes";
  }

  // Unquoted key detection
  const unquotedKeyMatch = code.match(/{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
  if (unquotedKeyMatch && !code.match(/{\s*"[^"]+"\s*:/)) {
    enhancedMessage = `Property names must be double-quoted: "${unquotedKeyMatch[1]}"`;
  }

  return {
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    message: enhancedMessage,
    severity: MarkerSeverity.Error,
    source: "json-validator",
  };
}

// ============================================================================
// JAVASCRIPT/TYPESCRIPT VALIDATION
// ============================================================================

/**
 * Validate JavaScript/TypeScript syntax.
 * Uses Function constructor for basic syntax validation.
 *
 * @param code - JavaScript code to validate
 * @returns ValidationResult with markers for any errors
 */
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
    // Use Function constructor for syntax check without execution
    new Function(code);

    // Additional bracket/quote validation
    const bracketMarkers = validateBrackets(code, ["{}", "[]", "()"]);
    markers.push(...bracketMarkers);

    // Check for unclosed template literals
    const templateMarkers = validateTemplateLiterals(code);
    markers.push(...templateMarkers);
  } catch (error) {
    const marker = extractJSErrorMarker(error, code);
    markers.push(marker);
  }

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

/**
 * Extract error marker from JavaScript parse error.
 */
function extractJSErrorMarker(error: unknown, code: string): ValidationMarker {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "JavaScript syntax error";
  const lines = code.split("\n");

  // Try to extract line number from stack trace
  // Common format: "at anonymous (<anonymous>:X:Y)"
  const stackMatch = message.match(/<anonymous>:(\d+):(\d+)/);
  // Or from error message: "Unexpected token (X:Y)"
  const tokenMatch = message.match(/\((\d+):(\d+)\)/);

  let startLineNumber = 1;
  let startColumn = 1;
  let endLineNumber = 1;
  let endColumn = (lines[0]?.length || 0) + 1;

  if (stackMatch || tokenMatch) {
    const match = stackMatch || tokenMatch;
    startLineNumber = parseInt(match![1], 10);
    startColumn = parseInt(match![2], 10);
    endLineNumber = startLineNumber;
    endColumn = startColumn + 1;
  }

  // Detect specific error types and provide better messages
  let enhancedMessage = message;

  if (message.includes("Unexpected token")) {
    // Extract the token
    const tokenExtract = message.match(/Unexpected token '?([^']*)'?/);
    if (tokenExtract) {
      enhancedMessage = `Unexpected token: ${tokenExtract[1]}`;
    }
  }

  if (message.includes("Unexpected end of input")) {
    enhancedMessage =
      "Unexpected end of code - possibly missing closing bracket or quote";
    startLineNumber = lines.length;
    startColumn = 1;
    endColumn = (lines[lines.length - 1]?.length || 0) + 1;
  }

  return {
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    message: enhancedMessage,
    severity: MarkerSeverity.Error,
    source: "js-validator",
  };
}

/**
 * Validate matching brackets in code.
 */
function validateBrackets(
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

        // Handle comments
        if (!inString) {
          if (char === "/" && nextChar === "/") {
            inComment = true;
          }
          if (char === "/" && nextChar === "*") {
            inMultiComment = true;
          }
          if (inMultiComment && char === "*" && nextChar === "/") {
            inMultiComment = false;
            colIndex++;
            continue;
          }
        }

        if (inComment || inMultiComment) continue;

        // Handle strings
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

        // Check brackets
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
      inComment = false; // Reset line comment at end of line
    }

    // Report unclosed brackets
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

/**
 * Validate template literals (backtick strings).
 */
function validateTemplateLiterals(code: string): ValidationMarker[] {
  const markers: ValidationMarker[] = [];
  const lines = code.split("\n");
  let inTemplate = false;
  let templateStart = { line: 0, column: 0 };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (let colIndex = 0; colIndex < line.length; colIndex++) {
      const char = line[colIndex];
      const prevChar = colIndex > 0 ? line[colIndex - 1] : "";

      if (char === "`" && prevChar !== "\\") {
        if (!inTemplate) {
          inTemplate = true;
          templateStart = { line: lineIndex + 1, column: colIndex + 1 };
        } else {
          inTemplate = false;
        }
      }
    }
  }

  if (inTemplate) {
    markers.push({
      startLineNumber: templateStart.line,
      startColumn: templateStart.column,
      endLineNumber: templateStart.line,
      endColumn: templateStart.column + 1,
      message: "Unclosed template literal",
      severity: MarkerSeverity.Error,
      source: "template-validator",
    });
  }

  return markers;
}

// ============================================================================
// PYTHON VALIDATION (Basic)
// ============================================================================

/**
 * Basic Python syntax validation.
 * Checks for common syntax issues without full Python parser.
 */
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

  // Check for basic Python syntax issues
  const lines = code.split("\n");

  // Check indentation consistency
  let baseIndent: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const indentMatch = line.match(/^(\s+)/);
    if (indentMatch) {
      const indent = indentMatch[1];
      if (baseIndent === null) {
        baseIndent = indent.includes("\t") ? "\t" : "    ";
      }
      // Check for mixed tabs and spaces
      if (indent.includes("\t") && indent.includes(" ")) {
        markers.push({
          startLineNumber: i + 1,
          startColumn: 1,
          endLineNumber: i + 1,
          endColumn: indent.length + 1,
          message: "Mixed tabs and spaces in indentation",
          severity: MarkerSeverity.Error,
          source: "python-validator",
        });
      }
    }
  }

  // Check for unclosed brackets
  markers.push(...validateBrackets(code, ["()", "[]", "{}"]));

  // Check for unclosed strings
  const stringMarkers = validatePythonStrings(code);
  markers.push(...stringMarkers);

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

/**
 * Validate Python string delimiters.
 */
function validatePythonStrings(code: string): ValidationMarker[] {
  const markers: ValidationMarker[] = [];
  const lines = code.split("\n");

  // Check for triple-quoted strings
  const tripleQuotes = ['"""', "'''"];
  for (const quote of tripleQuotes) {
    const matches =
      code.match(
        new RegExp(quote.replace(/'/g, "\\'").replace(/"/g, '\\"'), "g"),
      ) || [];
    if (matches.length % 2 !== 0) {
      markers.push({
        startLineNumber: lines.length,
        startColumn: 1,
        endLineNumber: lines.length,
        endColumn: (lines[lines.length - 1]?.length || 0) + 1,
        message: `Unclosed ${quote} string`,
        severity: MarkerSeverity.Error,
        source: "python-validator",
      });
    }
  }

  return markers;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Main validation entry point.
 * Routes to the appropriate language-specific validator.
 *
 * @param code - Code to validate
 * @param language - Target language
 * @param options - Optional validation configuration
 * @returns ValidationResult
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
 * Adds display-friendly severity labels.
 */
export function markersToErrorEntries(
  markers: ValidationMarker[],
): import("./types").ErrorPanelEntry[] {
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

/**
 * Get human-readable severity label.
 */
function getSeverityLabel(
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
