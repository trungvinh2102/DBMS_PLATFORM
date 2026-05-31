/**
 * @file types.ts
 * @description Centralized type definitions for SQLLab state and data.
 */

export interface SQLLabTab {
  id: string;
  name: string;
  sql: string;
  selectedDS: string;
  selectedSchema: string;
  results: any[];
  columns: any[];
  error: any | null;
  savedQueryId?: string;
  scriptPath?: string;
  workspaceBaseSql?: string;
}

export interface SyntaxError {
  lineNumber: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export type LeftActivityView = "database" | "repo" | "changes" | "graph";

export type RightPanelMode = "object" | "history" | "schema";

export type ResultTab = "results" | "messages" | "problems" | "lineage";

export interface CursorPosition {
  lineNumber: number;
  column: number;
}
