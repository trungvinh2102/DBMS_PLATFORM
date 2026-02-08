/**
 * @file sql-validator.ts
 * @description SQL syntax and rules validator.
 */

import { Parser } from "node-sql-parser";
import {
  MarkerSeverity,
  type ValidationMarker,
  type ValidationResult,
} from "../types";

const sqlParser = new Parser();

const SQL_DIALECT_MAP: Record<string, string> = {
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
  mariadb: "MariaDB",
  bigquery: "BigQuery",
};

export function validateSQL(
  code: string,
  dialect: string = "postgresql",
): ValidationResult {
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
    const parserDialect = SQL_DIALECT_MAP[dialect] || "PostgreSQL";
    sqlParser.astify(code, { database: parserDialect });
    markers.push(...runCustomSQLValidations(code));
  } catch (error) {
    markers.push(extractSQLErrorMarker(error, code));
  }

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

function extractSQLErrorMarker(error: unknown, code: string): ValidationMarker {
  const message =
    error instanceof Error ? error.message : "Unknown SQL syntax error";
  const lines = code.split("\n");

  let startLineNumber = 1,
    startColumn = 1,
    endLineNumber = 1,
    endColumn = lines[0]?.length || 1;

  // 1. Try to extract location from Jison hash (common in node-sql-parser)
  const hash = (error as any)?.hash;
  if (hash?.loc) {
    startLineNumber = hash.loc.first_line;
    startColumn = hash.loc.first_column + 1;
    endLineNumber = hash.loc.last_line;
    endColumn = hash.loc.last_column + 1;
  } else {
    // 2. Try to extract from message using multiple patterns
    // Matches "at line 3, column 5", "on line 3", "line 3: column 5", etc.
    const locationMatch = message.match(
      /(?:at|on|line)\s+(\d+)(?:[:,\s]+column\s+(\d+))?/i,
    );

    if (locationMatch) {
      startLineNumber = parseInt(locationMatch[1], 10);
      if (locationMatch[2]) {
        startColumn = parseInt(locationMatch[2], 10);
      }
      endLineNumber = startLineNumber;
      endColumn = (lines[startLineNumber - 1] || "").length + 1;
    }
  }

  // 3. Try to refine with "near" token search if available
  const nearMatch = message.match(/near ['"]([^'"]+)['"]/i);
  if (nearMatch) {
    const token = nearMatch[1];
    // Start searching from startLineNumber downwards
    for (let i = startLineNumber - 1; i < lines.length; i++) {
      const idx = lines[i].indexOf(token);
      if (idx !== -1) {
        startLineNumber = i + 1;
        startColumn = idx + 1;
        endLineNumber = i + 1;
        endColumn = idx + token.length + 1;
        break;
      }
    }
  }

  // 4. Special handling for "end of input" (incomplete query)
  if (
    message.toLowerCase().includes("end of input") ||
    message.toLowerCase().includes("unexpected end of string")
  ) {
    startLineNumber = lines.length;
    startColumn = Math.max(1, (lines[lines.length - 1] || "").length);
    endLineNumber = startLineNumber;
    endColumn = startColumn + 1;
  }

  // Ensure line numbers are within bounds
  startLineNumber = Math.max(1, Math.min(startLineNumber, lines.length));
  endLineNumber = Math.max(1, Math.min(endLineNumber, lines.length));

  return {
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    message: message
      .replace(/You have an error in your SQL syntax;?/gi, "")
      .replace(/Parse error on line \d+:?/gi, "")
      .trim(),
    severity: MarkerSeverity.Error,
    source: "sql-validator",
  };
}

function runCustomSQLValidations(code: string): ValidationMarker[] {
  const markers: ValidationMarker[] = [];
  const upperCode = code.toUpperCase();

  if (
    upperCode.includes("SELECT") &&
    !upperCode.includes("FROM") &&
    !/SELECT\s+[\d'"]/i.test(code)
  ) {
    markers.push({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 7,
      message: "SELECT statement may be missing FROM clause",
      severity: MarkerSeverity.Warning,
      source: "sql-rules",
    });
  }

  // Trailing comma check
  const match = /,\s*\n?\s*(FROM|WHERE|GROUP|ORDER|HAVING|LIMIT)\b/gi.exec(
    code,
  );
  if (match) {
    const lineIndex = code.substring(0, match.index).split("\n").length - 1;
    markers.push({
      startLineNumber: lineIndex + 1,
      startColumn: 1,
      endLineNumber: lineIndex + 1,
      endColumn: 2,
      message: `Trailing comma before ${match[1]}`,
      severity: MarkerSeverity.Error,
      source: "sql-rules",
    });
  }

  return markers;
}
