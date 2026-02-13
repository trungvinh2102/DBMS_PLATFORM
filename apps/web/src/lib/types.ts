/**
 * Shared types for the application.
 */

export interface DatabaseConfig {
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: boolean;
  [key: string]: any; // Allow for other config properties
}

export interface DataSource {
  id: string;
  databaseName: string;
  type: string;
  config?: DatabaseConfig;
  created_on?: string;
  changed_on?: string;
}

export interface PrivilegeType {
  id: string;
  code: string;
  category: string;
  description: string | null;
  created_on: string | null;
  changed_on: string | null;
}

export interface PrivilegeFormData {
  code: string;
  category: string;
  description: string;
}
