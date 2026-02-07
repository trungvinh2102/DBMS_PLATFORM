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
  name: string;
  type: string;
  description?: string;
  config?: DatabaseConfig;
  createdAt?: string;
  updatedAt?: string;
}
