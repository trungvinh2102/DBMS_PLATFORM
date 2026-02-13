/**
 * @file types.ts
 * @description Type definitions for Privilege Type management.
 */

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
