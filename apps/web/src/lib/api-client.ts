/**
 * @file api-client.ts
 * @description API client for connecting to the Flask backend.
 */

import axios from "axios";
import { useAuth } from "@/hooks/use-auth";

const getBaseURL = () => {
    // Priority 1: Environment variable set at build time (Vite)
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl !== "undefined") {
        return envUrl.endsWith("/") ? envUrl : `${envUrl}/`;
    }

    // Priority 2: Standard standalone/desktop local development
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // If we're running in Electron/Tauri via app://, tauri://, tauri.localhost, or localized localhost
        const isStandalone = 
            protocol === 'app:' || 
            protocol === 'tauri:' ||
            hostname === 'tauri.localhost' ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1';
            
        if (isStandalone) {
            // Using 127.0.0.1 is often more reliable than 'localhost' in some webview environments
            return "http://127.0.0.1:5000/api/";
        }
        
        // If we're in the browser on a web domain, use relative path (proxied)
        return "/api/"; 
    }

    // Default fallback
    return "http://127.0.0.1:5000/api/";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response: any) => response.data,
  (error: any) => {
    // Check for 401 Unauthorized
    if (error.response?.status === 401) {
      const isLoginRequest = error.config.url?.includes("auth/login");
      const isAlreadyOnLoginPage = typeof window !== "undefined" && window.location.pathname.includes("/auth/login");

      if (!isLoginRequest && !isAlreadyOnLoginPage) {
        // Clear auth state and redirect to login
        console.warn("API 401: Unauthorized. Logging out.");
        useAuth.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }
    }

    // Standardize error format
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unknown error occurred";
      
    if (error.message === "Network Error") {
      console.error("API Network Error: Check if backend is running at", getBaseURL());
    }
    
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
const req = (promise: Promise<any>) => promise as Promise<any>;

export const databaseApi = {
  list: () => req(api.get("database/list")),
  health: () => req(api.get("health")),
  create: (data: any) => req(api.post("database/create", data)),
  update: (data: any) => req(api.post("database/update", data)),
  delete: (id: string) => req(api.post("database/delete", { id })),
  test: (data: any) => req(api.post("database/test", data)),

  // Metadata
  getSchemas: (databaseId: string) =>
    req(api.get("database/schemas", { params: { databaseId } })),
  getTables: (databaseId: string, schema?: string) =>
    req(api.get("database/tables", { params: { databaseId, schema } })),
  getViews: (databaseId: string, schema?: string) =>
    req(api.get("database/views", { params: { databaseId, schema } })),
  getFunctions: (databaseId: string, schema?: string) =>
    req(api.get("database/functions", { params: { databaseId, schema } })),
  getProcedures: (databaseId: string, schema?: string) =>
    req(api.get("database/procedures", { params: { databaseId, schema } })),
  getTriggers: (databaseId: string, schema?: string) =>
    req(api.get("database/triggers", { params: { databaseId, schema } })),
  getEvents: (databaseId: string, schema?: string) =>
    req(api.get("database/events", { params: { databaseId, schema } })),
  getColumns: (databaseId: string, table: string, schema?: string) =>
    req(api.get("database/columns", { params: { databaseId, table, schema } })),
  getIndexes: (databaseId: string, table: string, schema?: string) =>
    req(api.get("database/indexes", { params: { databaseId, table, schema } })),
  getForeignKeys: (databaseId: string, table: string, schema?: string) =>
    req(
      api.get("database/foreign-keys", {
        params: { databaseId, table, schema },
      }),
    ),
  getTableInfo: (databaseId: string, table: string, schema?: string) =>
    req(
      api.get("database/table-info", {
        params: { databaseId, table, schema },
      }),
    ),
  getDDL: (databaseId: string, table: string, schema?: string) =>
    req(api.get("database/ddl", { params: { databaseId, table, schema } })),
  getAllColumns: (databaseId: string, schema?: string) =>
    req(api.get("database/all-columns", { params: { databaseId, schema } })),
  getAllForeignKeys: (databaseId: string, schema?: string) =>
    req(api.get("database/all-foreign-keys", { params: { databaseId, schema } })),

  // Execution
  execute: (
    databaseId: string,
    sql: string,
    autoCommit: boolean = true,
    limit?: number,
  ) =>
    req(api.post("database/execute", { databaseId, sql, autoCommit, limit })),
  saveQuery: (data: any) => req(api.post("database/save-query", data)),
  getHistory: (databaseId?: string) =>
    req(api.get("database/history", { params: { databaseId } })),
  listSavedQueries: (databaseId?: string, userId?: string) =>
    req(api.get("database/saved-queries", { params: { databaseId, userId } })),
  getSavedQueries: (databaseId: string, userId: string) =>
    req(api.get("database/saved-queries", { params: { databaseId, userId } })),
};

export const authApi = {
  login: (data: any) => req(api.post("auth/login", data)),
  register: (data: any) => req(api.post("auth/register", data)),
};

export const userApi = {
  getMe: () => req(api.get("user/me")),
  getSettings: () => req(api.get("user/settings")),
  updateSettings: (data: any) => req(api.post("user/settings", data)),
  updateProfile: (data: { name?: string; avatarUrl?: string; bio?: string }) => req(api.post("user/profile", data)),
  changePassword: (data: any) => req(api.post("user/change-password", data)),
};

export const aiApi = {
  generateSQL: (data: any) => req(api.post("ai/generate-sql", data)),
  explainSQL: (data: any) => req(api.post("ai/explain-sql", data)),
  optimizeSQL: (data: any) => req(api.post("ai/optimize-sql", data)),
  fixSQL: (data: any) => req(api.post("ai/fix-sql", data)),
};

export const resolveUrl = (path: string | null | undefined) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  // Remove /api/ from end of baseURL and append path
  const base = getBaseURL().replace(/\/api\/$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

export { api };
