/**
 * @file uri-utils.ts
 * @description Utility functions for parsing and building database connection URIs.
 */

import { DB_URI_PROTOCOLS } from "../components/constants";

/**
 * Parse a database connection URI into its individual components.
 */
export function parseUri(uri: string) {
  try {
    const url = new URL(uri);
    const protocol = url.protocol.replace(':', '').toLowerCase();

    // Special handling for local-file protocols
    if (protocol === 'sqlite' || protocol === 'duckdb') {
      return {
        host: "",
        port: "",
        user: "",
        password: "",
        // The file path starts after protocol:///
        database: url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname,
      };
    }

    return {
      host: url.hostname || "",
      port: url.port || "",
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "") || "",
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
  let protocol = DB_URI_PROTOCOLS[type] || type;

  // Special handling for local-file based databases
  if (type === "sqlite" || type === "duckdb") {
    // Return the triple-slash format for local files - normalize backslashes
    const normalizedPath = database.replace(/\\/g, "/");
    const cleanPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
    return `${protocol}://${cleanPath}`;
  }

  if (type === "mongodb" && !port) {
    protocol = "mongodb+srv";
  }

  // Don't build URI if essential fields are empty
  if (!host && !user && !database) {
    return "";
  }

  try {
    // Use URL constructor to properly encode values
    const url = new URL(`${protocol}://localhost`);
    url.hostname = host || "localhost";
    if (port) url.port = port;
    if (user) url.username = user;
    if (password) url.password = password;
    url.pathname = `/${database}`;

    return url.toString();
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
/**
 * Masks the password part of a connection URI.
 * Example: postgresql://user:password@host:port/db -> postgresql://user:********@host:port/db
 */
export function maskPasswordInUri(uri: string): string {
  if (!uri) return "";

  try {
    // Find the last '@' which separates credentials from host
    const lastAtIndex = uri.lastIndexOf("@");
    if (lastAtIndex === -1) return uri;

    const credentialsPart = uri.substring(0, lastAtIndex);
    const hostPart = uri.substring(lastAtIndex);

    // Find the last colon in the credentials part (after the protocol)
    const protocolEndIndex = credentialsPart.indexOf("://");
    const searchFrom = protocolEndIndex === -1 ? 0 : protocolEndIndex + 3;
    const lastColonIndex = credentialsPart.lastIndexOf(":");

    if (lastColonIndex > searchFrom - 1) {
      const maskedCredentials = credentialsPart.substring(0, lastColonIndex + 1) + "********";
      return maskedCredentials + hostPart;
    }

    return uri;
  } catch {
    return uri.replace(/:(.*)@/, ":********@");
  }
}
