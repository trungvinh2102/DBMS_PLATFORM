/**
 * @file chart-suggestion.ts
 * @description Intelligent chart type auto-suggestion based on data shape analysis.
 * Detects time columns, categorical vs numeric distributions, and row counts
 * to recommend the most appropriate chart visualization.
 */

import type { ChartType } from "../components/ChartControls";

/** Common date/time patterns in column names */
const TIME_COLUMN_PATTERNS = [
  /^(date|time|timestamp|created|updated|modified|day|month|year|hour|minute)/i,
  /(date|time|_at|_on|_ts|period|quarter|week)$/i,
];

/** Check if a column name looks like a time/date column */
function isTimeColumnName(name: string): boolean {
  return TIME_COLUMN_PATTERNS.some((pattern) => pattern.test(name));
}

/** Check if values in a column are parseable as dates */
function isTimeColumnValues(data: Record<string, unknown>[], column: string): boolean {
  if (data.length === 0) return false;

  let dateCount = 0;
  const sampleSize = Math.min(data.length, 10);

  for (let i = 0; i < sampleSize; i++) {
    const val = data[i][column];
    if (val === null || val === undefined) continue;
    const str = String(val);

    // ISO date, SQL date, or common formats
    if (
      /^\d{4}-\d{2}-\d{2}/.test(str) ||
      /^\d{2}\/\d{2}\/\d{4}/.test(str) ||
      /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(str)
    ) {
      dateCount++;
    }
  }

  return dateCount >= sampleSize * 0.5; // At least half look like dates
}

/** Detect numeric columns from data */
function getNumericColumns(
  columns: string[],
  data: Record<string, unknown>[]
): string[] {
  return columns.filter((col) => {
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const val = data[i][col];
      if (typeof val === "number") return true;
      if (typeof val === "string" && !isNaN(parseFloat(val)) && val.trim() !== "")
        return true;
    }
    return false;
  });
}

/** Detect categorical (non-numeric) columns */
function getCategoricalColumns(
  columns: string[],
  numericColumns: string[]
): string[] {
  return columns.filter((col) => !numericColumns.includes(col));
}

export interface ChartSuggestion {
  type: ChartType;
  reason: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Suggest the best chart type based on data columns and values.
 *
 * Rules (ordered by priority):
 * 1. Time column + numeric → Line chart (time series)
 * 2. Few categorical + 1 numeric + ≤8 rows → Pie chart (part-to-whole)
 * 3. Categorical + numeric → Bar chart (comparison)
 * 4. Multiple numeric → Area chart (trends)
 * 5. Default → Bar chart
 */
export function suggestChartType(
  columns: string[],
  data: Record<string, unknown>[]
): ChartSuggestion {
  if (!columns.length || !data.length) {
    return { type: "bar", reason: "No data to analyze", confidence: "low" };
  }

  const numericCols = getNumericColumns(columns, data);
  const categoricalCols = getCategoricalColumns(columns, numericCols);
  const rowCount = data.length;

  // Detect time columns (by name OR by values)
  const timeColumns = columns.filter(
    (col) => isTimeColumnName(col) || isTimeColumnValues(data, col)
  );
  const hasTimeColumn = timeColumns.length > 0;

  // Rule 1: Time series → Line chart
  if (hasTimeColumn && numericCols.length >= 1) {
    return {
      type: "line",
      reason: `Time series detected (${timeColumns[0]})`,
      confidence: "high",
    };
  }

  // Rule 2: Part-to-whole → Pie chart
  if (
    categoricalCols.length >= 1 &&
    numericCols.length === 1 &&
    rowCount <= 8 &&
    rowCount >= 2
  ) {
    return {
      type: "pie",
      reason: `${rowCount} categories with single metric — ideal for proportions`,
      confidence: "high",
    };
  }

  // Rule 3: Categorical comparison → Bar chart
  if (categoricalCols.length >= 1 && numericCols.length >= 1) {
    return {
      type: "bar",
      reason: `Comparing ${numericCols.length} metric(s) across categories`,
      confidence: "high",
    };
  }

  // Rule 4: Multiple numeric, no categorical → Area chart
  if (numericCols.length >= 2 && categoricalCols.length === 0) {
    return {
      type: "area",
      reason: "Multiple numeric columns — showing distribution",
      confidence: "medium",
    };
  }

  // Rule 5: Default
  return {
    type: "bar",
    reason: "Default visualization",
    confidence: "low",
  };
}
