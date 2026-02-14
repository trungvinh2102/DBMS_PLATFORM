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

export interface Role {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  item_type: string;
  children?: Role[];
  created_on: string | null;
  changed_on: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string | null;
  roles: string[]; // List of role names
  role: string | null; // Primary role (legacy)
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

export interface RolePrivilege {
  id: string;
  roleId: string;
  roleName: string | null;
  privilegeTypeId: string;
  privilegeCode: string | null;
  privilegeCategory: string | null;
  resourceType: string | null;
  resourceId: string | null;
  conditionExpr: string | null;
  inheritedFromRole?: string | null;
  created_on: string | null;
}

export enum MaskingRuleType {
  PARTIAL = "PARTIAL",
  FULL = "FULL",
  HASH = "HASH",
  EMAIL = "EMAIL",
  REGEX = "REGEX",
  NULL = "NULL",
}

export interface MaskingPolicy {
  id: string;
  name: string;
  description?: string;
  resourceSchema?: string;
  resourceTable: string;
  resourceColumn: string;
  roleId?: string;
  roleName?: string;
  maskingType: MaskingRuleType;
  maskingArgs?: string;
  isEnabled: boolean;
  priority: number;
  created_on?: string;
  changed_on?: string;
}

export interface MaskingPreviewResponse {
  originalSQL: string;
  rewrittenSQL: string;
  appliedPolicies: string[];
}

export interface MaskingPattern {
  id: string;
  name: string;
  description?: string;
  maskingType: MaskingRuleType;
  maskingArgs?: string;
  created_on?: string;
  changed_on?: string;
}
