/**
 * @file api-client.ts
 * @description API client for connecting to the Flask backend.
 */

import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import type {
  DataSource,
  Role,
  User,
  PrivilegeType,
  PrivilegeFormData,
  RolePrivilege,
  MaskingPreviewResponse,
  MaskingPattern,
  MaskingPolicy as AppMaskingPolicy,
} from "./types";
import type {
  SensitiveResource,
  SensitivePolicy,
} from "./sensitive-data-types";
import type {
  DataResource,
  MaskingPolicy as DataAccessMaskingPolicy,
  DataAccessPolicy,
  MaskingType,
  SensitivityLevel,
  PolicySubjectType,
} from "./data-access-types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response: any) => response.data,
  (error: any) => {
    // Check for 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      console.warn("API 401: Unauthorized. Logging out.");
      useAuth.getState().logout();
      if (typeof window !== "undefined") {
        // Optionally force redirect
        // window.location.href = "/auth/login";
      }
    }

    // Standardize error format
    const message =
      error.response?.data?.error ||
      error.message ||
      "An unknown error occurred";
    return Promise.reject(new Error(message));
  },
);

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuth.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Utility to cast response
const req = <T>(promise: Promise<any>) => promise as Promise<T>;

export const databaseApi = {
  list: () => req<DataSource[]>(api.get("/database/list")),
  health: () => req<any>(api.get("/health")),
  create: (data: Partial<DataSource>) =>
    req<DataSource>(api.post("/database/create", data)),
  update: (data: Partial<DataSource>) =>
    req<DataSource>(api.post("/database/update", data)),
  delete: (id: string) => req<void>(api.post("/database/delete", { id })),
  test: (data: Partial<DataSource>) =>
    req<{ status: string; message: string }>(api.post("/database/test", data)),

  // Metadata
  getSchemas: (databaseId: string) =>
    req(api.get("/database/schemas", { params: { databaseId } })),
  getTables: (databaseId: string, schema?: string) =>
    req(api.get("/database/tables", { params: { databaseId, schema } })),
  getColumns: (databaseId: string, table: string, schema?: string) =>
    req(
      api.get("/database/columns", { params: { databaseId, table, schema } }),
    ),
  getIndexes: (databaseId: string, table: string, schema?: string) =>
    req(
      api.get("/database/indexes", { params: { databaseId, table, schema } }),
    ),
  getForeignKeys: (databaseId: string, table: string, schema?: string) =>
    req(
      api.get("/database/foreign-keys", {
        params: { databaseId, table, schema },
      }),
    ),
  getTableInfo: (databaseId: string, table: string, schema?: string) =>
    req(
      api.get("/database/table-info", {
        params: { databaseId, table, schema },
      }),
    ),
  getDDL: (databaseId: string, table: string, schema?: string) =>
    req(api.get("/database/ddl", { params: { databaseId, table, schema } })),

  // Execution
  execute: (databaseId: string, sql: string) =>
    req(api.post("/database/execute", { databaseId, sql })),
  saveQuery: (data: any) => req(api.post("/database/save-query", data)),
  getHistory: (databaseId?: string) =>
    req(api.get("/database/history", { params: { databaseId } })),
  listSavedQueries: (databaseId?: string, userId?: string) =>
    req(api.get("/database/saved-queries", { params: { databaseId, userId } })),
};

export const authApi = {
  login: (data: any) => req(api.post("/auth/login", data)),
  register: (data: any) => req(api.post("/auth/register", data)),
};

export const userApi = {
  getMe: () => req(api.get("/user/me")),
  getSettings: () => req(api.get("/user/settings")),
  updateSettings: (data: any) => req(api.post("/user/settings", data)),

  // New: Privilege Check
  getMyPrivileges: () => req<any[]>(api.get("/user/me/privileges")),

  // Admin: User Mgmt
  list: () => req<User[]>(api.get("/user/")),
  addRole: (userId: string, roleId: string) =>
    req(api.post(`/user/${userId}/roles`, { roleId })),
  removeRole: (userId: string, roleId: string) =>
    req(api.delete(`/user/${userId}/roles/${roleId}`)),
};

export const roleApi = {
  list: () => req<Role[]>(api.get("/roles/")),
  getHierarchy: () => req<Role[]>(api.get("/roles/hierarchy")),
  get: (id: string) => req<Role>(api.get(`/roles/${id}`)),
  create: (data: Partial<Role>) => req<Role>(api.post("/roles/", data)),
  update: (id: string, data: Partial<Role>) =>
    req<Role>(api.put(`/roles/${id}`, data)),
  delete: (id: string) => req<{ success: boolean }>(api.delete(`/roles/${id}`)),
};

export const aiApi = {
  generateSQL: (data: any) => req(api.post("/ai/generate-sql", data)),
  explainSQL: (data: any) => req(api.post("/ai/explain-sql", data)),
  optimizeSQL: (data: any) => req(api.post("/ai/optimize-sql", data)),
};

export const privilegeApi = {
  // Privilege Types
  listTypes: (category?: string) =>
    req<PrivilegeType[]>(api.get("/privilege/types", { params: { category } })),
  getType: (id: string) =>
    req<PrivilegeType>(api.get(`/privilege/types/${id}`)),
  createType: (data: PrivilegeFormData) =>
    req<PrivilegeType>(api.post("/privilege/types", data)),
  updateType: (id: string, data: PrivilegeFormData) =>
    req<PrivilegeType>(api.put(`/privilege/types/${id}`, data)),
  deleteType: (id: string) => req<void>(api.delete(`/privilege/types/${id}`)),

  // Role Privileges
  listRolePrivileges: (roleId?: string) =>
    req<RolePrivilege[]>(
      api.get("/privilege/role-privileges", { params: { roleId } }),
    ),
  listByResource: (resourceType: string, resourceId?: string) =>
    req<RolePrivilege[]>(
      api.get("/privilege/role-privileges", {
        params: { resourceType, resourceId },
      }),
    ),
  assignPrivilege: (data: {
    roleId: string;
    privilegeTypeId: string;
    resourceType?: string;
    resourceId?: string;
    conditionExpr?: string;
  }) => req<RolePrivilege>(api.post("/privilege/role-privileges", data)),
  revokePrivilege: (id: string) =>
    req<{ success: boolean }>(api.delete(`/privilege/role-privileges/${id}`)),

  // Utility
  getCategories: () => req(api.get("/privilege/categories")),
  getResourceTypes: () => req(api.get("/privilege/resource-types")),
  seedDefaults: () => req(api.post("/privilege/seed")),
};

export const dataAccessApi = {
  // Resources
  listResources: (databaseId?: string) =>
    req<DataResource[]>(
      api.get("/data-access/resources", { params: { databaseId } }),
    ),
  createResource: (data: Partial<DataResource>) =>
    req<{ id: string; status: string }>(
      api.post("/data-access/resources", data),
    ),

  // Masking Policies
  listMaskingPolicies: () =>
    req<DataAccessMaskingPolicy[]>(api.get("/data-access/masking-policies")),
  createMaskingPolicy: (data: Partial<DataAccessMaskingPolicy>) =>
    req<{ id: string; status: string }>(
      api.post("/data-access/masking-policies", data),
    ),

  // Access Policies
  listAccessPolicies: () =>
    req<DataAccessPolicy[]>(api.get("/data-access/policies")),
  createAccessPolicy: (data: Partial<DataAccessPolicy>) =>
    req<{ id: string; status: string }>(
      api.post("/data-access/policies", data),
    ),
};

export const maskingApi = {
  list: () => req<AppMaskingPolicy[]>(api.get("/masking/policies")),
  create: (data: Partial<AppMaskingPolicy>) =>
    req<AppMaskingPolicy>(api.post("/masking/policies", data)),
  update: (id: string, data: Partial<AppMaskingPolicy>) =>
    req<AppMaskingPolicy>(api.put(`/masking/policies/${id}`, data)),
  delete: (id: string) => req<void>(api.delete(`/masking/policies/${id}`)),
  previewSQL: (sql: string, roleId?: string) =>
    req<MaskingPreviewResponse>(
      api.post("/masking/preview/sql", { sql, roleId }),
    ),

  // Patterns
  listPatterns: () => req<MaskingPattern[]>(api.get("/masking/patterns")),
  createPattern: (data: Partial<MaskingPattern>) =>
    req<MaskingPattern>(api.post("/masking/patterns", data)),
  updatePattern: (id: string, data: Partial<MaskingPattern>) =>
    req<MaskingPattern>(api.put(`/masking/patterns/${id}`, data)),
  deletePattern: (id: string) =>
    req<void>(api.delete(`/masking/patterns/${id}`)),
};

export const sensitiveDataApi = {
  // Resources
  listResources: (databaseId?: string) =>
    req<SensitiveResource[]>(
      api.get("/sensitive-data/resources", { params: { databaseId } }),
    ),
  createResource: (data: Partial<SensitiveResource>) =>
    req<SensitiveResource>(api.post("/sensitive-data/resources", data)),
  updateResource: (id: string, data: Partial<SensitiveResource>) =>
    req<SensitiveResource>(api.patch(`/sensitive-data/resources/${id}`, data)),
  deleteResource: (id: string) =>
    req<{ status: string }>(api.delete(`/sensitive-data/resources/${id}`)),

  // Policies
  listPolicies: (resourceId?: string) =>
    req<SensitivePolicy[]>(
      api.get("/sensitive-data/policies", { params: { resourceId } }),
    ),
  createPolicy: (data: Partial<SensitivePolicy>) =>
    req<SensitivePolicy>(api.post("/sensitive-data/policies", data)),
  updatePolicy: (id: string, data: Partial<SensitivePolicy>) =>
    req<SensitivePolicy>(api.patch(`/sensitive-data/policies/${id}`, data)),
  deletePolicy: (id: string) =>
    req<{ status: string }>(api.delete(`/sensitive-data/policies/${id}`)),
};
