/**
 * @file sql-validator.ts
 * @description SQL syntax and rules validator.
 */

import { Parser } from "node-sql-parser";
import { MySQL, PostgreSQL } from "dt-sql-parser";
import {
  MarkerSeverity,
  type ValidationMarker,
  type ValidationResult,
} from "../types";

// Cache parser instances
// Note: GenericSQL is not available in all versions, so we rely on specific parsers
// and fallback to node-sql-parser for others.
const parsers = {
  mysql: new MySQL(),
  postgresql: new PostgreSQL(),
};

const nodeSqlParser = new Parser();

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

  // 1. Try dt-sql-parser for supported dialects
  const dtParser = parsers[dialect as keyof typeof parsers];

  if (dtParser) {
    try {
      const errors = dtParser.validate(code);
      if (errors && errors.length > 0) {
        markers.push(...errors.map((err: any) => mapDtErrorToMarker(err)));
      }
    } catch (error: any) {
      console.warn("dt-sql-parser error:", error);
    }
  }

  // 2. Fallback to node-sql-parser if no markers found yet OR dt-parser wasn't available
  // We check markers.length === 0 to avoid duplicates if dt-parser already found errors
  if (markers.length === 0) {
    try {
      const parserDialect = SQL_DIALECT_MAP[dialect] || "PostgreSQL";
      nodeSqlParser.astify(code, { database: parserDialect });
    } catch (error: any) {
      // Filter out spurious "column does not exist" errors from parser
      const msg = error.message || "";
      if (
        !msg.toLowerCase().includes("column") ||
        !msg.toLowerCase().includes("does not exist")
      ) {
        markers.push(extractSQLErrorMarker(error, code));
      }
    }
  }

  // 3. Custom logical rules (apply to all)
  markers.push(...runCustomSQLValidations(code));

  return {
    isValid:
      markers.filter((m) => m.severity === MarkerSeverity.Error).length === 0,
    markers,
    validationTime: performance.now() - startTime,
  };
}

function mapDtErrorToMarker(error: any): ValidationMarker {
  let message = error.message;

  // Clean up ANTLR Error Messages
  if (message.includes("mismatched input")) {
    const match = message.match(/mismatched input '([^']+)'/);
    if (match) {
      message = `Unexpected token '${match[1]}'`;
    }
  } else if (message.includes("no viable alternative at input")) {
    const match = message.match(/no viable alternative at input '([^']+)'/);
    if (match) {
      message = `Invalid syntax near '${match[1]}'`;
    }
  } else if (message.includes("is not valid at this position")) {
    const match = message.match(/'([^']+)' is not valid at this position/);
    if (match) {
      message = `Unexpected token '${match[1]}'`;
    }
  } else if (message.includes("missing") && message.includes("at")) {
    const match = message.match(/missing '([^']+)'/);
    if (match) {
      message = `Missing '${match[1]}'`;
    }
  }

  return {
    startLineNumber: error.startLine,
    startColumn: error.startColumn,
    endLineNumber: error.endLine,
    endColumn: error.endColumn,
    message: message,
    severity: MarkerSeverity.Error,
    source: "dt-sql-parser",
  };
}

function extractSQLErrorMarker(error: any, code: string): ValidationMarker {
  const message =
    error instanceof Error ? error.message : "Unknown SQL syntax error";
  const lines = code.split("\n");

  let startLineNumber = 1,
    startColumn = 1,
    endLineNumber = 1,
    endColumn = lines[0]?.length || 1;

  // node-sql-parser location
  const location = error.location;
  const hash = error.hash;

  if (location) {
    startLineNumber = location.start.line;
    startColumn = location.start.column;
    endLineNumber = location.end.line;
    endColumn = location.end.column;
  } else if (hash?.loc) {
    startLineNumber = hash.loc.first_line;
    startColumn = hash.loc.first_column + 1;
    endLineNumber = hash.loc.last_line;
    endColumn = hash.loc.last_column + 1;
  } else {
    // Regex fallback
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

  // "end of input" fallback
  if (
    message.toLowerCase().includes("end of input") ||
    message.toLowerCase().includes("unexpected end of string")
  ) {
    startLineNumber = lines.length;
    startColumn = Math.max(1, (lines[lines.length - 1] || "").length);
    endLineNumber = startLineNumber;
    endColumn = startColumn + 1;
  }

  // Bounds check
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
    source: "node-sql-parser",
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
