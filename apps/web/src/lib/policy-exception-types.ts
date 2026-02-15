/**
 * @file policy-exception-types.ts
 * @description Type definitions for Policy Exceptions.
 */

export type ExceptionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ExceptionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "REVOKED";

export interface PolicyException {
  id: string;
  subjectType: "USER" | "ROLE";
  subjectId: string;
  resourceId?: string;
  overridePrivilege: string;
  scope: "TABLE" | "COLUMN" | "DATASET";
  purpose: string;
  startTime: string;
  endTime: string;
  approvedBy?: string;
  riskLevel: ExceptionRiskLevel;
  status: ExceptionStatus;
  createdOn: string;
  changedOn: string;
}

export interface PolicyExceptionRequest {
  subjectType: "USER" | "ROLE";
  subjectId: string;
  resourceId?: string;
  overridePrivilege: string;
  scope: "TABLE" | "COLUMN" | "DATASET";
  purpose: string;
  startTime: string;
  endTime: string;
  riskLevel: ExceptionRiskLevel;
}
