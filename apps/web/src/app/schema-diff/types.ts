/**
 * @file types.ts
 * @description Shared TypeScript contracts for the Schema Diff page.
 */

export interface DatabaseConnection {
  id: string;
  type?: string;
  databaseName?: string;
  environment?: string;
  isReadOnly?: boolean;
}

export interface SchemaDiffOperation {
  id: string;
  action: "add" | "drop" | "modify";
  objectType: "table" | "column" | "index" | "foreign_key";
  objectName: string;
  tableName?: string;
  severity: "safe" | "review" | "destructive";
  summary: string;
  source?: Record<string, unknown>;
  target?: Record<string, unknown>;
  sql: string[];
}

export interface SchemaDiffResult {
  sourceDatabaseId: string;
  targetDatabaseId: string;
  sourceSchema?: string;
  targetSchema?: string;
  targetDialect: string;
  operations: SchemaDiffOperation[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    safe: number;
    review: number;
    destructive: number;
    total: number;
  };
  migrationScript: string;
  warnings: string[];
}
