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
}

export interface SyntaxError {
  lineNumber: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export type RightPanelMode = "object" | "history" | "schema";

export type ResultTab = "results" | "messages" | "problems" | "lineage";

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

/**
 * Ownership metadata frozen at Monaco selection-event time. A selection is
 * only valid while both facts still describe the current editor context.
 */
export interface EditorSelectionMeta {
  /** Exact SQL content of the owning tab when the selection event fired. */
  ownerSql: string;
  /** Identity of the editor mount (session) that reported the selection. */
  sessionId: string;
}

/** Tab-scoped editor text selection plus its ownership metadata. */
export interface EditorSelection extends EditorSelectionMeta {
  tabId: string;
  sql: string;
}
