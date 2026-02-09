/**
 * Shared types for the API package.
 */

export interface DatabaseConfig {
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  [key: string]: unknown;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  config?: unknown;
  created_on?: Date;
  changed_on?: Date;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  table?: string;
}

export interface SchemaInfo {
  name: string;
}

export interface QueryResult<T = unknown> {
  data: T[];
  columns: string[];
  executionTime: number;
  error: string | null;
}

export interface UserSettings {
  theme?: "light" | "dark" | "system";
  language?: "en" | "vi";
  editorFontSize?: number;
  editorFontFamily?: string;
  editorTabSize?: number;
  editorMinimap?: boolean;
  editorWordWrap?: "on" | "off" | "wordWrapColumn" | "bounded";
  editorLineNumbers?: "on" | "off" | "relative" | "interval";
  editorFormatOnPaste?: boolean;
  editorFormatOnSave?: boolean;
  defaultQueryLimit?: number;
  showNullAs?: string;
  dateTimeFormat?: string;
  csvDelimiter?: "," | ";";
}
