/**
 * @file sensitive-data-types.ts
 * @description Types for Sensitive Data management based on documentation.
 */

export enum SensitivityLevel {
  PUBLIC = "PUBLIC", // LEVEL 0
  INTERNAL = "INTERNAL", // LEVEL 1
  CONFIDENTIAL = "CONFIDENTIAL", // LEVEL 2
  SENSITIVE = "SENSITIVE", // LEVEL 3
  PII = "PII", // LEVEL 4
  CRITICAL = "CRITICAL", // LEVEL 5
}

export enum ProtectionStrategy {
  ENCRYPTION = "ENCRYPTION",
  TOKENIZATION = "TOKENIZATION",
  MASKING = "MASKING",
  HASHING = "HASHING",
  AGGREGATION = "AGGREGATION",
  REDACTION = "REDACTION",
  SYNTHETIC_DATA = "SYNTHETIC_DATA",
  ACCESS_DENY = "ACCESS_DENY",
}

export enum ResourceType {
  TABLE = "TABLE",
  COLUMN = "COLUMN",
  DATASET = "DATASET",
}

export interface SensitiveResource {
  id: string;
  resource_type: ResourceType;
  resource_name: string;
  sensitivity_level: SensitivityLevel;
  owner?: string;
  database_id: string;
  description?: string;
  created_on?: string;
  changed_on?: string;
}

export interface SensitivePolicy {
  id: string;
  resource_id: string;
  privilege_type: string;
  role_id: string;
  role_name?: string;
  policy_expr?: string;
  protection_strategy: ProtectionStrategy;
  created_on?: string;
  changed_on?: string;
}
