/**
 * Data Access Types
 */

export enum SensitivityLevel {
  PUBLIC = "PUBLIC",
  INTERNAL = "INTERNAL",
  CONFIDENTIAL = "CONFIDENTIAL",
  PII = "PII",
  CRITICAL = "CRITICAL",
}

export enum MaskingType {
  NONE = "NONE",
  REDACT = "REDACT",
  PARTIAL = "PARTIAL",
  HASH = "HASH",
  NULLIFY = "NULLIFY",
  SHUFFLE = "SHUFFLE",
  CUSTOM = "CUSTOM",
}

export enum PolicySubjectType {
  USER = "USER",
  ROLE = "ROLE",
  GROUP = "GROUP",
  SERVICE_ACCOUNT = "SERVICE_ACCOUNT",
}

export interface DataResource {
  id: string;
  databaseId: string;
  schemaName: string;
  tableName: string;
  columnName?: string;
  resourceType: string;
  sensitivity: SensitivityLevel;
  tags?: Record<string, any>;
  description?: string;
  created_on?: string;
}

export interface MaskingPolicy {
  id: string;
  name: string;
  maskingType: MaskingType;
  parameters?: Record<string, any>; // e.g., { show_last: 4 }
  condition?: Record<string, any>;
  description?: string;
  created_on?: string;
}

export interface DataAccessPolicy {
  id: string;
  name: string;
  subjectType: string; // USER, ROLE
  subjectId: string;
  privilegeCode: string;
  resourceId?: string;
  maskingPolicyId?: string;
  environmentCondition?: string;
  priority: number;
  isActive: boolean;
  created_on?: string;
}
