/**
 * @file api-client.ts
 * @description API client for connecting to the Flask backend.
 */

import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import type { DataSource, PrivilegeType, PrivilegeFormData } from "./types";

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
      // Clear auth state and redirect to login
      console.warn("API 401: Unauthorized. Logging out.");
      useAuth.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
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
    req(api.get("/privilege/role-privileges", { params: { roleId } })),
  assignPrivilege: (data: any) =>
    req(api.post("/privilege/role-privileges", data)),
  revokePrivilege: (id: string) =>
    req(api.delete(`/privilege/role-privileges/${id}`)),

  // Utility
  getCategories: () => req(api.get("/privilege/categories")),
  getResourceTypes: () => req(api.get("/privilege/resource-types")),
  seedDefaults: () => req(api.post("/privilege/seed")),
};
