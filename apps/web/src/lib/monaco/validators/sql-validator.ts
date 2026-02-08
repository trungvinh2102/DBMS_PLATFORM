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
  const lineMatch = message.match(/at line (\d+)/i);
  const locationMatch = message.match(/line (\d+), column (\d+)/i);
  const nearMatch = message.match(/near ['"]([^'"]+)['"]/i);

  let startLineNumber = 1,
    startColumn = 1,
    endLineNumber = 1,
    endColumn = lines[0]?.length || 1;

  if (locationMatch) {
    startLineNumber = parseInt(locationMatch[1], 10);
    startColumn = parseInt(locationMatch[2], 10);
    endLineNumber = startLineNumber;
    endColumn = startColumn + 5;
  } else if (lineMatch) {
    startLineNumber = parseInt(lineMatch[1], 10);
    endLineNumber = startLineNumber;
    endColumn = (lines[startLineNumber - 1] || "").length + 1;
  }

  if (nearMatch) {
    const token = nearMatch[1];
    for (let i = 0; i < lines.length; i++) {
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

  return {
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    message: message
      .replace(/You have an error in your SQL syntax;?/gi, "")
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
