/**
 * @file uri-utils.ts
 * @description Utility functions for parsing and building database connection URIs.
 */

import { DB_URI_PROTOCOLS } from "../database-connections/components/constants";

/**
 * Parse a database connection URI into its individual components.
 */
export function parseUri(uri: string) {
  try {
    const url = new URL(uri);
    return {
      host: url.hostname || "",
      port: url.port || "",
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: decodeURIComponent(url.pathname.replace(/^\//, "") || ""),
    };
  } catch {
    return null;
  }
}

/**
 * Build a connection URI string from individual database components.
 */
export function buildUri(
  type: string,
  host: string,
  port: string,
  user: string,
  password: string,
  database: string,
): string {
  const protocol = DB_URI_PROTOCOLS[type] || type;

  // Don't build URI if essential fields are empty
  if (!host && !user && !database) {
    return "";
  }

  try {
    // Build URI manually to avoid URL-encoding the database name
    // (URL API encodes spaces and special chars in pathname)
    const encodedUser = user ? encodeURIComponent(user) : "";
    const encodedPassword = password ? encodeURIComponent(password) : "";
    const userPart = encodedUser
      ? encodedPassword
        ? `${encodedUser}:${encodedPassword}@`
        : `${encodedUser}@`
      : "";
    const hostPart = host || "localhost";
    const portPart = port ? `:${port}` : "";

    return `${protocol}://${userPart}${hostPart}${portPart}/${database}`;
  } catch {
    // Fallback to manual construction for non-standard URI formats if needed
    const userPart = user
      ? password
        ? `${user}:${password}@`
        : `${user}@`
      : "";
    const portPart = port ? `:${port}` : "";
    return `${protocol}://${userPart}${host || "localhost"}${portPart}/${database}`;
  }
}
