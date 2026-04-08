/**
 * @file sidebar-utils.tsx
 * @description Helper functions for the SQL Lab sidebar, including database icon mapping.
 */

import React from "react";
import { Database } from "lucide-react";
import {
  SiPostgresql,
  SiMysql,
  SiOracle,
  SiSqlite,
  SiMongodb,
  SiRedis,
  SiClickhouse,
  SiDuckdb,
} from "react-icons/si";
import { DiMsqlServer } from "react-icons/di";

/**
 * Returns the appropriate database icon for a given data source type.
 */
export const getDBIcon = (type: string) => {
  const t = type?.toLowerCase() || "";
  if (t.includes("postgres"))
    return <SiPostgresql className="h-5 w-5 text-blue-500" />;
  if (t.includes("mysql"))
    return <SiMysql className="h-5 w-5 text-orange-500" />;
  if (t.includes("sqlserver"))
    return <DiMsqlServer className="h-5 w-5 text-red-600" />;
  if (t.includes("oracle"))
    return <SiOracle className="h-5 w-5 text-red-500" />;
  if (t.includes("sqlite"))
    return <SiSqlite className="h-5 w-5 text-sky-500" />;
  if (t.includes("duckdb"))
    return <SiDuckdb className="h-5 w-5 text-yellow-500" />;
  if (t.includes("mongodb"))
    return <SiMongodb className="h-5 w-5 text-emerald-500" />;
  if (t.includes("redis"))
    return <SiRedis className="h-5 w-5 text-red-500" />;
  if (t.includes("clickhouse"))
    return <SiClickhouse className="h-5 w-5 text-orange-500" />;
  return <Database className="h-5 w-5" />;
};

/**
 * Formats the database name and subtext for display.
 * For file-based databases, parses the path to show filename as primary.
 */
export const formatDBName = (ds: any) => {
  if (!ds) return { title: "Select Database", subtitle: "" };
  
  const type = ds.type?.toLowerCase() || "";
  const isFile = ["sqlite", "duckdb"].includes(type);
  
  if (isFile) {
    const path = ds.config?.database || ds.databaseName || "";
    if (path.includes("/") || path.includes("\\")) {
      const parts = path.split(/[\\/]/);
      let filename = parts[parts.length - 1] || "";
      filename = filename.replace(/\.(db|duckdb|sqlite|sqlite3)$/i, "");
      const dir = parts.slice(0, -1).join("/") + "/";
      return { 
        title: filename || path, 
        subtitle: dir.length > 30 ? "..." + dir.slice(-27) : dir 
      };
    }
    const title = (path || "Local Database").replace(/\.(db|duckdb|sqlite|sqlite3)$/i, "");
    return { title, subtitle: type.toUpperCase() };
  }
  
  return { 
    title: ds.databaseName || "Untitled", 
    subtitle: ds.config?.host || "localhost" 
  };
};
